import React, { useState } from 'react';
import { BookOpen, TrendingUp, Calculator, Brain, Triangle, Globe } from 'lucide-react';

const topics = [
	{
		name: 'Series',
		icon: Calculator,
		color: 'from-purple-500 to-indigo-500',
		description: 'Arithmetic and geometric sequences, convergence and divergence',
	},
	{
		name: 'Functions',
		icon: Brain,
		color: 'from-blue-500 to-cyan-500',
		description: 'Linear, quadratic, exponential and logarithmic functions',
	},
	{
		name: 'Trigonometry',
		icon: Triangle,
		color: 'from-pink-500 to-rose-500',
		description: 'Sin, cos, tan, and trigonometric identities',
	},
];

type HomePageProps = {
	onTopicSelect: (topic: string) => void;
	onGenerateReport: () => void;
};

export default function HomePage({ onTopicSelect, onGenerateReport }: HomePageProps) {
	const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

	const handleTopicClick = (topicName: string) => {
		setSelectedTopic(topicName);
	};

	const handleStartPractice = () => {
		if (selectedTopic) {
			onTopicSelect(selectedTopic);
		}
	};

	return (
		<div className="w-full h-screen flex flex-col bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 p-6">
			<div className="max-w-7xl w-full mx-auto flex-1 flex flex-col">
				{/* Header */}
				<div className="text-center mb-8">
					<div className="flex items-center justify-center mb-6">
						<div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-2xl flex items-center justify-center mr-4">
							<BookOpen className="w-8 h-8 text-white" />
						</div>
						<h1 className="text-4xl font-bold text-gray-800">Study Revision Tool</h1>
					</div>
					<p className="text-xl text-gray-600 max-w-2xl mx-auto">
						Master your math skills with targeted practice and personalized feedback
					</p>
				</div>

				{/* Topic Selector Container */}
				<div className="flex-1">
					<div className="bg-white rounded-2xl shadow-xl p-8 border border-purple-100 h-full flex flex-col">
						<div className="flex items-center justify-between mb-8">
							<h2 className="text-2xl font-bold text-gray-800">Choose Your Topic</h2>
							<button
								onClick={onGenerateReport}
								className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-6 py-3 rounded-xl font-semibold hover:from-emerald-600 hover:to-teal-600 transform hover:scale-105 transition-all duration-200 shadow-lg flex items-center space-x-2"
							>
								<TrendingUp className="w-5 h-5" />
								<span>Generate Report</span>
							</button>
						</div>

						{/* Topic Grid */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 flex-1">
							{topics.map((topic) => {
								const IconComponent = topic.icon;
								return (
									<div
										key={topic.name}
										onClick={() => handleTopicClick(topic.name)}
										className={`group relative bg-gradient-to-br ${topic.color} p-6 rounded-2xl cursor-pointer transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl ${
											selectedTopic === topic.name ? 'ring-4 ring-white ring-opacity-60' : ''
										}`}
										style={{ minHeight: '100px' }}
									>
										<div className="flex items-start space-x-4 relative z-10">
											<div className="bg-white bg-opacity-20 p-3 rounded-xl">
												<IconComponent className="w-8 h-8 text-white" />
											</div>
											<div className="flex-1">
												<h3 className="text-xl font-bold text-white mb-2 drop-shadow-sm">{topic.name}</h3>
												<p className="text-white text-opacity-90 text-sm leading-relaxed drop-shadow-sm">
													{topic.description}
												</p>
											</div>
										</div>

										{/* Selection indicator */}
										{selectedTopic === topic.name && (
											<div className="absolute top-4 right-4">
												<div className="w-6 h-6 bg-white rounded-full flex items-center justify-center">
													<div className="w-3 h-3 bg-green-500 rounded-full" />
												</div>
											</div>
										)}
									</div>
								);
							})}
						</div>

						{/* Bottom Action */}
						{selectedTopic && (
							<div className="mt-4 p-6 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl border border-purple-200">
								<div className="flex items-center justify-between">
									<div>
										<h3 className="text-lg font-semibold text-gray-800 mb-2">
											Ready to practice {selectedTopic}?
										</h3>
										<p className="text-gray-600">
											Click start to begin your focused study session
										</p>
									</div>
									<button
										onClick={handleStartPractice}
										className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white px-8 py-4 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-600 transform hover:scale-105 transition-all duration-200 shadow-lg"
									>
										Start Practice
									</button>
								</div>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}