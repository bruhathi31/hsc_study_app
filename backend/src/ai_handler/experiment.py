import os
from dotenv import load_dotenv
import boto3
import json

load_dotenv()

# Get AWS credentials from environment variables
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")

# Create a Bedrock client using boto3
bedrock = boto3.client(
    service_name="bedrock-runtime",
    region_name=AWS_REGION,
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
)

def generate_ai_response(system_prompt, user_message, model_id="amazon.nova-pro-v1:0"):
    """
    Generate a response from AWS Bedrock GenAI bot using a system prompt.
    """
    try:
        # For Amazon Titan models, use the converse API with proper message format
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
        
        # Extract the response text
        response_text = response['output']['message']['content'][0]['text']
        return response_text
        
    except Exception as e:
        print(f"Error generating AI response: {e}")
        return None


# Example usage and test
if __name__ == "__main__":
    # Check if credentials are available
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        print("Error: AWS credentials not found. Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file")
        exit(1)
    
    example_system_prompt = """

    You are an experienced mathematics tutor. Your role is to help students learn from their mistakes by analyzing their incorrect responses and providing targeted feedback.

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
    - **Mistake Type** - [silly mistake/content error/method error/etc.]
    - **Explanation** - [student's explanation of what went wrong]

    ## Your Response Structure

    ### 1. Overall Summary
    Provide a brief overview of the student's performance patterns, highlighting:
    - Main topic areas with difficulties
    - Types of mistakes (silly errors vs content gaps)
    - Overall learning priorities

    ### 2. Topic-by-Topic Breakdown
    For each mathematical topic, create:

    **[Topic Name]**
    - **Mistake Pattern**: [Brief description of what went wrong]
    - **Remember**: [Key point to prevent this mistake]
    - **Next Steps**: [Specific practice recommendation]

    ### 3. Mistake Prevention Strategies
    Create memorable bullet points using:
    - **Silly Mistakes**: Focus on checking procedures and common traps
    - **Content Errors**: Address fundamental concept gaps
    - **Method Errors**: Clarify correct approaches and when to use them

    ## Tone and Approach

    - **Encouraging**: Frame mistakes as learning opportunities
    - **Specific**: Give concrete, actionable advice
    - **Practical**: Provide strategies students can immediately apply
    - **Australian context**: Use familiar terminology and examples

    ## Example Response Format

    **Overall Summary:**
    Need to focus on accuracy in algebraic manipulation and careful reading of questions.

    **Algebra:**
    - **Mistake Pattern**: Sign errors when rearranging equations
    - **Remember**: "When moving terms across the equals sign, flip the sign - positive becomes negative, negative becomes positive"
    - **Next Steps**: Practice 10 simple rearrangement problems daily, checking each step

    **Key Reminders:**
    • Always double-check sign changes when rearranging
    • Read the question twice before starting
    • Show all working steps to catch errors early

    Remember: Every mistake is a step toward mastery. Focus on understanding why each error occurred rather than just getting the right answer.
    """
    example_user_message = """Here are the mistakes from today's Year 10 practice test:

    Topic - Algebra
    Mistake Type - Silly mistake
    Explanation - I forgot to make it negative on the other side when I moved 3x across the equals sign

    Question ID - 15

    Topic - Algebra
    Mistake Type - Content error
    Explanation - I don't remember how to expand (x+3)(x-2) properly, I got confused with the signs

    Question ID - 23

    Topic - Quadratic equations
    Mistake Type - Method error
    Explanation - I tried to use the quadratic formula but the question wanted me to factorise instead

    Question ID - 31

    Topic - Linear graphs
    Mistake Type - Silly mistake
    Explanation - I calculated the gradient correctly but then used the wrong point to find the y-intercept"""
    
    print("Sending request to AWS Bedrock...")
    
    # Try with Amazon Titan
    response = generate_ai_response(example_system_prompt, example_user_message)
    if response:
        print("AI Response (Titan):")
        print(response)
    