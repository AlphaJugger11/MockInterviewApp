import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Star, Brain, Target, TrendingUp } from 'lucide-react';
import Layout from '../components/Layout';
import { testimonials } from '../data/mockData';

const Landing = () => {
  const features = [
    {
      icon: Brain,
      title: 'AI-Powered Coaching',
      description: 'Get personalized feedback from our advanced AI coach that analyzes your answers, body language, and speech patterns.'
    },
    {
      icon: Target,
      title: 'Role-Specific Practice',
      description: 'Practice for specific roles and companies with tailored questions and industry-relevant scenarios.'
    },
    {
      icon: TrendingUp,
      title: 'Performance Analytics',
      description: 'Track your progress with detailed analytics and see your improvement over time with actionable insights.'
    }
  ];

  return (
    <Layout isPublic>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="font-poppins font-bold text-5xl md:text-6xl lg:text-7xl text-light-text-primary dark:text-dark-text-primary mb-6 leading-tight">
              The AI Interview Coach<br />
              <span className="text-light-accent dark:text-dark-accent">That Gets You Hired</span>
            </h1>
            <p className="font-inter text-xl md:text-2xl text-light-text-secondary dark:text-dark-text-secondary mb-8 max-w-3xl mx-auto leading-relaxed">
              Practice with AI-powered mock interviews, get real-time feedback, and land your dream job with confidence.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/auth"
                className="inline-flex items-center px-8 py-4 bg-light-accent dark:bg-dark-accent text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Start for Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
              <button className="inline-flex items-center px-8 py-4 border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary font-semibold rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors">
                Watch Demo
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-light-secondary dark:bg-dark-secondary">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-poppins font-bold text-4xl md:text-5xl text-light-text-primary dark:text-dark-text-primary mb-4">
              Why Choose Ascend AI?
            </h2>
            <p className="font-inter text-xl text-light-text-secondary dark:text-dark-text-secondary max-w-2xl mx-auto">
              Our cutting-edge AI technology provides the most realistic and effective interview preparation experience.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-light-primary dark:bg-dark-primary p-8 rounded-2xl border border-light-border dark:border-dark-border">
                <div className="w-12 h-12 bg-light-accent dark:bg-dark-accent rounded-lg flex items-center justify-center mb-6">
                  <feature.icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-poppins font-semibold text-xl text-light-text-primary dark:text-dark-text-primary mb-4">
                  {feature.title}
                </h3>
                <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-poppins font-bold text-4xl md:text-5xl text-light-text-primary dark:text-dark-text-primary mb-4">
              Success Stories
            </h2>
            <p className="font-inter text-xl text-light-text-secondary dark:text-dark-text-secondary max-w-2xl mx-auto">
              See how Ascend AI has helped professionals land their dream jobs at top companies.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial) => (
              <div key={testimonial.id} className="bg-light-secondary dark:bg-dark-secondary p-6 rounded-2xl border border-light-border dark:border-dark-border">
                <div className="flex items-center mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                  ))}
                </div>
                <p className="font-inter text-light-text-primary dark:text-dark-text-primary mb-6">
                  "{testimonial.content}"
                </p>
                <div className="flex items-center">
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full mr-4"
                  />
                  <div>
                    <h4 className="font-poppins font-semibold text-light-text-primary dark:text-dark-text-primary">
                      {testimonial.name}
                    </h4>
                    <p className="text-sm text-light-text-secondary dark:text-dark-text-secondary">
                      {testimonial.role} at {testimonial.company}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Preview Section */}
      <section id="pricing" className="py-24 bg-light-secondary dark:bg-dark-secondary">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-poppins font-bold text-4xl md:text-5xl text-light-text-primary dark:text-dark-text-primary mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="font-inter text-xl text-light-text-secondary dark:text-dark-text-secondary max-w-2xl mx-auto">
              Choose the plan that works best for your interview preparation needs.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="bg-light-primary dark:bg-dark-primary p-8 rounded-2xl border border-light-border dark:border-dark-border">
              <h3 className="font-poppins font-semibold text-2xl text-light-text-primary dark:text-dark-text-primary mb-4">
                Free
              </h3>
              <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary mb-6">
                Perfect for getting started
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary">$0</span>
                <span className="text-light-text-secondary dark:text-dark-text-secondary">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-light-accent dark:text-dark-accent mr-3" />
                  <span className="font-inter text-light-text-primary dark:text-dark-text-primary">3 mock interviews</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-light-accent dark:text-dark-accent mr-3" />
                  <span className="font-inter text-light-text-primary dark:text-dark-text-primary">Basic feedback</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-light-accent dark:text-dark-accent mr-3" />
                  <span className="font-inter text-light-text-primary dark:text-dark-text-primary">Standard questions</span>
                </li>
              </ul>
              <Link
                to="/auth"
                className="w-full inline-flex items-center justify-center px-6 py-3 border border-light-border dark:border-dark-border text-light-text-primary dark:text-dark-text-primary font-semibold rounded-lg hover:bg-light-secondary dark:hover:bg-dark-secondary transition-colors"
              >
                Get Started
              </Link>
            </div>

            <div className="bg-light-primary dark:bg-dark-primary p-8 rounded-2xl border-2 border-light-accent dark:border-dark-accent relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="bg-light-accent dark:bg-dark-accent text-white px-4 py-1 rounded-full text-sm font-medium">
                  Most Popular
                </span>
              </div>
              <h3 className="font-poppins font-semibold text-2xl text-light-text-primary dark:text-dark-text-primary mb-4">
                Pro
              </h3>
              <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary mb-6">
                For serious job seekers
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-light-text-primary dark:text-dark-text-primary">$29</span>
                <span className="text-light-text-secondary dark:text-dark-text-secondary">/month</span>
              </div>
              <ul className="space-y-3 mb-8">
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-light-accent dark:text-dark-accent mr-3" />
                  <span className="font-inter text-light-text-primary dark:text-dark-text-primary">Unlimited interviews</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-light-accent dark:text-dark-accent mr-3" />
                  <span className="font-inter text-light-text-primary dark:text-dark-text-primary">Advanced AI feedback</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-light-accent dark:text-dark-accent mr-3" />
                  <span className="font-inter text-light-text-primary dark:text-dark-text-primary">Custom questions</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-light-accent dark:text-dark-accent mr-3" />
                  <span className="font-inter text-light-text-primary dark:text-dark-text-primary">Body language analysis</span>
                </li>
                <li className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-light-accent dark:text-dark-accent mr-3" />
                  <span className="font-inter text-light-text-primary dark:text-dark-text-primary">Performance analytics</span>
                </li>
              </ul>
              <Link
                to="/auth"
                className="w-full inline-flex items-center justify-center px-6 py-3 bg-light-accent dark:bg-dark-accent text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Start Free Trial
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-16 border-t border-light-border dark:border-dark-border">
        <div className="max-w-8xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-6">
                <Brain className="h-8 w-8 text-light-accent dark:text-dark-accent" />
                <span className="font-poppins font-bold text-xl text-light-text-primary dark:text-dark-text-primary">
                  Ascend AI
                </span>
              </div>
              <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
                The next-generation AI interview coach helping professionals land their dream jobs.
              </p>
            </div>
            <div>
              <h4 className="font-poppins font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                Product
              </h4>
              <ul className="space-y-2">
                <li><a href="#" className="font-inter text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">Features</a></li>
                <li><a href="#" className="font-inter text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">Pricing</a></li>
                <li><a href="#" className="font-inter text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">API</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-poppins font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                Company
              </h4>
              <ul className="space-y-2">
                <li><a href="#" className="font-inter text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">About Us</a></li>
                <li><a href="#" className="font-inter text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">Contact</a></li>
                <li><a href="#" className="font-inter text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">Careers</a></li>
              </ul>
            </div>
            <div>
              <h4 className="font-poppins font-semibold text-light-text-primary dark:text-dark-text-primary mb-4">
                Support
              </h4>
              <ul className="space-y-2">
                <li><a href="#" className="font-inter text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">Help Center</a></li>
                <li><a href="#" className="font-inter text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">Privacy Policy</a></li>
                <li><a href="#" className="font-inter text-light-text-secondary dark:text-dark-text-secondary hover:text-light-text-primary dark:hover:text-dark-text-primary">Terms of Service</a></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-light-border dark:border-dark-border text-center">
            <p className="font-inter text-light-text-secondary dark:text-dark-text-secondary">
              © 2024 Ascend AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </Layout>
  );
};

export default Landing;