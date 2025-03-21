import React from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <div 
        className="relative h-[600px] bg-cover bg-center"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1498931299472-f7a63a5a1cfa?ixlib=rb-1.2.1&auto=format&fit=crop&w=1950&q=80")'
        }}
      >
        <div className="absolute inset-0 bg-black bg-opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full flex items-center">
          <div className="text-white">
            <h1 className="text-5xl font-bold mb-4">
              Light Up Your Celebrations
            </h1>
            <p className="text-xl mb-8 max-w-2xl">
              Discover our premium selection of fireworks for any occasion. 
              From backyard celebrations to professional displays, we've got 
              you covered.
            </p>
            <Link
              to="/shop"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-purple-700 bg-white hover:bg-purple-50"
            >
              Shop Now
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Featured Categories */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Featured Categories</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Aerial Fireworks",
              image: "https://images.unsplash.com/photo-1576161787924-01bb08dad4a4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
              description: "Create spectacular sky displays"
            },
            {
              title: "Ground Effects",
              image: "https://images.unsplash.com/photo-1552413544-30ea3c971a0e?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
              description: "Amazing fountains and ground shows"
            },
            {
              title: "Party Packs",
              image: "https://images.unsplash.com/photo-1467810563316-b5476525c0f9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
              description: "Complete celebration packages"
            }
          ].map((category, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
              <img 
                src={category.image} 
                alt={category.title}
                className="w-full h-48 object-cover"
              />
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  {category.title}
                </h3>
                <p className="text-gray-600 mb-4">{category.description}</p>
                <Link
                  to={`/shop/${category.title.toLowerCase().replace(' ', '-')}`}
                  className="text-purple-600 hover:text-purple-700 font-medium"
                >
                  Browse Category →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Safety Notice */}
      <div className="bg-purple-50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Safety First
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              All purchases require age verification. We prioritize safety and 
              compliance with local regulations. Please read our safety guidelines 
              before making a purchase.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}