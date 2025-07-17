import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, X, Download, Maximize2, Minimize2 } from 'lucide-react';

interface Slide {
  id: number;
  title: string;
  content: string;
  backgroundImage?: string;
}

interface PresentationViewerProps {
  slides: Slide[];
  onClose: () => void;
  presentationTitle: string;
}

const PresentationViewer: React.FC<PresentationViewerProps> = ({ 
  slides, 
  onClose, 
  presentationTitle 
}) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const handleDownload = () => {
    // This would trigger the download of the actual PPT file
    console.log('Download presentation');
  };

  if (slides.length === 0) return null;

  return (
    <div className={`fixed inset-0 bg-black z-50 flex flex-col ${isFullscreen ? '' : 'p-4'}`}>
      {/* Header Controls */}
      {!isFullscreen && (
        <div className="flex items-center justify-between bg-gray-900 text-white p-4 rounded-t-lg">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold truncate">{presentationTitle}</h2>
            <span className="text-sm text-gray-300">
              {currentSlide + 1} of {slides.length}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Download"
            >
              <Download className="w-5 h-5" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Fullscreen"
            >
              <Maximize2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Presentation Area */}
      <div className="flex-1 flex">
        {/* Slide Thumbnails Sidebar */}
        {!isFullscreen && (
          <div className="w-64 bg-gray-800 p-4 overflow-y-auto">
            <h3 className="text-white text-sm font-medium mb-4">Slides</h3>
            <div className="space-y-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  onClick={() => goToSlide(index)}
                  className={`w-full p-3 text-left rounded-lg transition-colors ${
                    currentSlide === index
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <div className="text-xs font-medium mb-1">Slide {index + 1}</div>
                  <div className="text-xs truncate">{slide.title}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main Slide Display */}
        <div className="flex-1 flex flex-col bg-gray-900 relative">
          {/* Fullscreen Controls */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-10 flex space-x-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 bg-black bg-opacity-50 text-white hover:bg-opacity-70 rounded-lg transition-colors"
                title="Exit Fullscreen"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
              <button
                onClick={onClose}
                className="p-2 bg-black bg-opacity-50 text-white hover:bg-opacity-70 rounded-lg transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Slide Content */}
          <div className="flex-1 flex items-center justify-center p-8">
            <div 
              className="w-full max-w-4xl aspect-video bg-white rounded-lg shadow-2xl flex flex-col justify-center items-center p-12 relative"
              style={{
                backgroundImage: slides[currentSlide].backgroundImage 
                  ? `url(${slides[currentSlide].backgroundImage})` 
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              <div className="text-center z-10">
                <h1 className="text-4xl font-bold text-white mb-8 drop-shadow-lg">
                  {slides[currentSlide].title}
                </h1>
                <div className="text-lg text-white leading-relaxed drop-shadow-md max-w-3xl">
                  {slides[currentSlide].content.split('\n').map((line, index) => (
                    <p key={index} className="mb-4">{line}</p>
                  ))}
                </div>
              </div>
              
              {/* Slide overlay for better text readability */}
              <div className="absolute inset-0 bg-black bg-opacity-30 rounded-lg"></div>
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between p-6">
            <button
              onClick={prevSlide}
              disabled={currentSlide === 0}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              <span>Previous</span>
            </button>

            <div className="flex items-center space-x-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => goToSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    currentSlide === index ? 'bg-blue-500' : 'bg-gray-500 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>

            <button
              onClick={nextSlide}
              disabled={currentSlide === slides.length - 1}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <span>Next</span>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PresentationViewer;