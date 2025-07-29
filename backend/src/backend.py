import enum
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Text, Enum, create_engine, DateTime
from sqlalchemy.ext.declarative import declarative_base
from pydantic import BaseModel
import os
from dotenv import load_dotenv
import boto3

# Load environment variables
load_dotenv()

app = FastAPI()

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or ["*"] for all origins (not recommended for production)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = "sqlite:///hsc_app.db"
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

# AWS Bedrock configuration
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Create Bedrock client
bedrock = None
if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    bedrock = boto3.client(
        service_name="bedrock-runtime",
        region_name=AWS_REGION,
        aws_access_key_id=AWS_ACCESS_KEY_ID,
        aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    )

# Database Models
Base = declarative_base()

class ErrorType(enum.Enum):
    silly = "silly"
    concept = "concept"
    none = "none"

class Question(Base):
    __tablename__ = 'questions'
    
    question_id = Column(Integer, primary_key=True)
    topic = Column(String, nullable=False)
    question_img = Column(String, nullable=False)
    answer_img = Column(String, nullable=False)

    attempts = relationship('Attempt', back_populates='question')

class Attempt(Base):
    __tablename__ = 'attempts'
    
    id = Column(Integer, primary_key=True)
    question_id = Column(Integer, ForeignKey('questions.question_id'))
    error_type = Column(Enum(ErrorType), nullable=True)
    explanation = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)

    question = relationship('Question', back_populates='attempts')

# Pydantic Models for API
class AttemptResponse(BaseModel):
    id: int
    question_id: int
    error_type: Optional[str]
    explanation: Optional[str]
    timestamp: str
    question: dict

    class Config:
        from_attributes = True

class ReportRequest(BaseModel):
    attempts: List[dict]

class ReportResponse(BaseModel):
    report: str

# AI Report Generation Function
def generate_ai_response(system_prompt: str, user_message: str, model_id: str = "amazon.nova-pro-v1:0") -> Optional[str]:
    """Generate a response from AWS Bedrock GenAI bot using a system prompt."""
    if not bedrock:
        return None
        
    try:
        messages = [
            {
                "role": "user", 
                "content": [{"text": f"{system_prompt}\n\nUser: {user_message}"}]
            }
        ]
        
        response = bedrock.converse(
            modelId=model_id,
            messages=messages,
        )
        
        response_text = response['output']['message']['content'][0]['text']
        return response_text
        
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return None

def format_attempts_for_ai(attempts: List[dict]) -> str:
    """Format attempts data for AI analysis."""
    formatted_attempts = []
    
    for attempt in attempts:
        if attempt.get('error_type') and attempt['error_type'] != 'none':
            topic = attempt.get('question', {}).get('topic', 'Unknown')
            error_type = attempt.get('error_type', 'Unknown')
            explanation = attempt.get('explanation', 'No explanation provided')
            question_id = attempt.get('question_id', 'Unknown')
            
            formatted_attempts.append(f"""
Topic - {topic}
Mistake Type - {error_type}
Explanation - {explanation}
Question ID - {question_id}
""")
    
    if not formatted_attempts:
        return "No mistakes found in the provided attempts. All questions were answered correctly!"
    
    return "\n".join(formatted_attempts)

# API Endpoints
@app.get("/questions_by_topic/{topic}")
def get_questions_by_topic(topic: str):
    session = Session()
    try:
        questions = session.query(Question).filter(Question.topic == topic).all()
        if not questions:
            raise HTTPException(status_code=404, detail="No questions found for this topic")
        return [
            {
                "question_id": q.question_id,
                "topic": q.topic,
                "question_img": q.question_img,
                "answer_img": q.answer_img
            }
            for q in questions
        ]
    finally:
        session.close()

@app.post("/attempt")
def create_attempt(
    question_id: int = Body(...),
    error_type: str = Body(None),
    explanation: str = Body(None)
):
    session = Session()
    try:
        # Validate question exists
        question = session.query(Question).filter(Question.question_id == question_id).first()
        if not question:
            raise HTTPException(status_code=404, detail="Question not found")
        
        # Validate error_type
        error_enum = None
        if error_type:
            try:
                error_enum = ErrorType(error_type)
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid error_type")
        
        attempt = Attempt(
            question_id=question_id,
            error_type=error_enum,
            explanation=explanation
        )
        session.add(attempt)
        session.commit()
        
        return {"message": "Attempt created successfully", "id": attempt.id}
    finally:
        session.close()

@app.get("/topics")
def get_topics():
    session = Session()
    try:
        topics = session.query(Question.topic).distinct().all()
        return [t[0] for t in topics]
    finally:
        session.close()

@app.get("/attempts")
def get_all_attempts():
    """Fetch all attempts with their associated question data."""
    session = Session()
    try:
        attempts = session.query(Attempt).join(Question).all()
        
        return [
            {
                "id": attempt.id,
                "question_id": attempt.question_id,
                "error_type": attempt.error_type.value if attempt.error_type else None,
                "explanation": attempt.explanation,
                "timestamp": attempt.timestamp.isoformat() + "Z" if attempt.timestamp else datetime.utcnow().isoformat() + "Z",
                "question": {
                    "topic": attempt.question.topic,
                    "question_id": attempt.question.question_id
                }
            }
            for attempt in attempts
        ]
    finally:
        session.close()

@app.post("/generate-report")
def generate_report(request: ReportRequest):
    """Generate an AI-powered study report based on attempt data."""
    
    system_prompt = """
You are an experienced mathematics tutor. Your role is to help students learn from their mistakes by analyzing their incorrect responses and providing targeted feedback.
Please have a maximum of 250 words
## Your Task

When you receive student mistake data, you will:

1. **Analyze the mistake patterns** across different topics and question types
2. **Summarize key learning areas** that need attention
3. **Create targeted bullet points** for each mistake to help students remember and avoid repeating errors
4. **Provide constructive feedback**

## Data Format You'll Receive

The student mistake data will be formatted as:
- **Question ID** - [number]
- **Topic** - [Australian curriculum topic area]
- **Mistake Type** - [silly mistake/concept error/etc.]
- **Explanation** - [student's explanation of what went wrong]

## Your Response Structure

### 1. Overall Summary
Provide a brief overview of the student's performance patterns, highlighting:
- Main topic areas with difficulties
- Types of mistakes (silly errors vs content gaps)
- Overall learning priorities

### 2. Topic-by-Topic Breakdown
For each mathematical topic, create:

**[Topic Name]:**
- **Mistake Pattern**: [Brief description of what went wrong]
- **Remember**: [Key point to prevent this mistake]
- **Next Steps**: [Specific practice recommendation]

### 3. Key Reminders
Create memorable bullet points using:
- **Silly Mistakes**: Focus on checking procedures and common traps
- **Concept Errors**: Address fundamental concept gaps

## Tone and Approach

- **Encouraging**: Frame mistakes as learning opportunities
- **Specific**: Give concrete, actionable advice
- **Practical**: Provide strategies students can immediately apply
- **Australian context**: Use familiar terminology and examples

## Example Response Format

**Overall Summary:**
Based on your recent practice sessions, you're showing strong mathematical reasoning but need to focus on accuracy in algebraic manipulation and careful attention to detail.

**Algebra:**
- **Mistake Pattern**: Sign errors when rearranging equations
- **Remember**: "When moving terms across the equals sign, flip the sign - positive becomes negative, negative becomes positive"
- **Next Steps**: Practice 10 simple rearrangement problems daily, checking each step

**Key Reminders:**
• Always double-check sign changes when rearranging equations
• Show all working steps to catch errors early
• Take time to verify final answers by substitution

**Strengths to Build On:**
• Strong understanding of mathematical concepts
• Good problem-solving approach

Remember: Every mistake is a step toward mastery. Focus on understanding why each error occurred rather than just getting the right answer.
"""

    # Format the attempts data for AI analysis
    formatted_attempts = format_attempts_for_ai(request.attempts)
    
    # Generate AI report
    ai_response = None
    if bedrock:
        ai_response = generate_ai_response(system_prompt, formatted_attempts)
    
    # Fallback response if AI is not available or fails
    if not ai_response:
        # Count mistake types for fallback report
        silly_mistakes = sum(1 for attempt in request.attempts if attempt.get('error_type') == 'silly')
        concept_errors = sum(1 for attempt in request.attempts if attempt.get('error_type') == 'concept')
        
        ai_response = f"""**Overall Summary:**
Based on your recent practice sessions, you completed {len(request.attempts)} questions. You made {silly_mistakes} silly mistakes and {concept_errors} concept errors.

**Key Areas for Improvement:**
- Focus on double-checking your work to avoid silly mistakes
- Review fundamental concepts where you had difficulties
- Practice more problems in topics where you made errors

**General Advice:**
• Take your time when working through problems
• Show all working steps to catch errors early
• Review your mistakes to understand what went wrong
• Practice regularly to build confidence

Remember: Every mistake is a learning opportunity. Keep practicing and you'll continue to improve!

*Note: This is a basic report. For detailed AI analysis, please check your AWS Bedrock configuration.*"""

    return ReportResponse(report=ai_response)

# Database initialization
if __name__ == "__main__":
    Base.metadata.create_all(engine)
    print("Database and tables created.")

    # Add sample questions if not present
    session = Session()
    try:
        # Check if we have any questions
        existing_questions = session.query(Question).count()
        if existing_questions == 0:
            # Add sample questions
            sample_questions = [
                Question(topic="Trigonometry", question_img="sample_trig_question.png", answer_img="sample_trig_answer.png"),
                Question(topic="Algebra", question_img="sample_algebra_question.png", answer_img="sample_algebra_answer.png"),
                Question(topic="Geometry", question_img="sample_geometry_question.png", answer_img="sample_geometry_answer.png"),
                Question(topic="Linear graphs", question_img="sample_linear_question.png", answer_img="sample_linear_answer.png"),
                Question(topic="Fractions", question_img="sample_fractions_question.png", answer_img="sample_fractions_answer.png"),
            ]
            for question in sample_questions:
                session.add(question)
            session.commit()
            print("Sample questions added.")
    finally:
        session.close()