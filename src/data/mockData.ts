export interface Session {
  id: string;
  role: string;
  company: string;
  date: string;
  score: number;
  duration: string;
  status: 'completed' | 'in-progress' | 'scheduled';
}

export interface Question {
  id: string;
  question: string;
  answer: string;
  feedback: string;
  score: number;
  strengths: string[];
  improvements: string[];
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  content: string;
  rating: number;
  avatar: string;
}

export const mockSessions: Session[] = [
  {
    id: '1',
    role: 'Senior Frontend Developer',
    company: 'Netflix',
    date: '2024-01-15',
    score: 82,
    duration: '45 min',
    status: 'completed'
  },
  {
    id: '2',
    role: 'Product Manager',
    company: 'Google',
    date: '2024-01-12',
    score: 78,
    duration: '50 min',
    status: 'completed'
  },
  {
    id: '3',
    role: 'UX Designer',
    company: 'Apple',
    date: '2024-01-10',
    score: 85,
    duration: '40 min',
    status: 'completed'
  },
  {
    id: '4',
    role: 'Data Scientist',
    company: 'Meta',
    date: '2024-01-08',
    score: 76,
    duration: '55 min',
    status: 'completed'
  },
  {
    id: '5',
    role: 'Software Engineer',
    company: 'Tesla',
    date: '2024-01-05',
    score: 89,
    duration: '48 min',
    status: 'completed'
  },
  {
    id: '6',
    role: 'DevOps Engineer',
    company: 'Amazon',
    date: '2024-01-03',
    score: 73,
    duration: '42 min',
    status: 'completed'
  },
  {
    id: '7',
    role: 'Full Stack Developer',
    company: 'Spotify',
    date: '2024-01-01',
    score: 81,
    duration: '46 min',
    status: 'completed'
  },
  {
    id: '8',
    role: 'Backend Engineer',
    company: 'Airbnb',
    date: '2023-12-28',
    score: 77,
    duration: '52 min',
    status: 'completed'
  },
  {
    id: '9',
    role: 'Frontend Developer',
    company: 'Uber',
    date: '2023-12-25',
    score: 84,
    duration: '38 min',
    status: 'completed'
  },
  {
    id: '10',
    role: 'Machine Learning Engineer',
    company: 'OpenAI',
    date: '2023-12-22',
    score: 91,
    duration: '60 min',
    status: 'completed'
  }
];

export const mockQuestions: Question[] = [
  {
    id: '1',
    question: 'Tell me about a time you faced a difficult challenge at work.',
    answer: 'I was leading a project with a tight deadline when our main developer left unexpectedly...',
    feedback: 'Good use of STAR method. Clear situation and task description.',
    score: 85,
    strengths: ['Clear structure', 'Specific examples', 'Quantified results'],
    improvements: ['Could be more concise', 'Add more emotional intelligence elements']
  },
  {
    id: '2',
    question: 'Describe a situation where you had to work with a difficult team member.',
    answer: 'In my previous role, I worked with a colleague who was resistant to feedback...',
    feedback: 'Excellent demonstration of conflict resolution skills.',
    score: 88,
    strengths: ['Diplomatic approach', 'Focus on solutions', 'Professional tone'],
    improvements: ['Could include more specific outcomes']
  },
  {
    id: '3',
    question: 'How do you prioritize tasks when everything seems urgent?',
    answer: 'I use a combination of the Eisenhower Matrix and stakeholder impact analysis...',
    feedback: 'Strong methodology and practical approach.',
    score: 82,
    strengths: ['Systematic approach', 'Clear framework', 'Real examples'],
    improvements: ['More detail on stakeholder communication']
  }
];

export const scoreData = [
  { session: 'Session 1', score: 72 },
  { session: 'Session 2', score: 76 },
  { session: 'Session 3', score: 78 },
  { session: 'Session 4', score: 82 },
  { session: 'Session 5', score: 85 },
  { session: 'Session 6', score: 89 },
];

export const testimonials: Testimonial[] = [
  {
    id: '1',
    name: 'Sarah Chen',
    role: 'Software Engineer',
    company: 'Google',
    content: 'Ascend AI helped me land my dream job at Google. The AI feedback was incredibly detailed and helped me identify blind spots I never knew I had.',
    rating: 5,
    avatar: 'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2'
  },
  {
    id: '2',
    name: 'Marcus Rodriguez',
    role: 'Product Manager',
    company: 'Microsoft',
    content: 'The practice sessions were so realistic, I felt completely prepared for my actual interviews. The body language analysis was a game-changer.',
    rating: 5,
    avatar: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2'
  },
  {
    id: '3',
    name: 'Emily Watson',
    role: 'Data Scientist',
    company: 'Netflix',
    content: 'I went from nervous wreck to confident interviewee in just 2 weeks. The personalized coaching made all the difference in my performance.',
    rating: 5,
    avatar: 'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=2'
  }
];