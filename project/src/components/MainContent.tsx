import React, { useState } from 'react';
import { Plus, Send, Bell, Loader2, Mail, Download, X, FileText, Image, Link, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PresentationViewer from './PresentationViewer';

interface Slide {
  id: number;
  title: string;
  content: string;
  backgroundImage?: string;
}

const MainContent: React.FC = () => {
  const [inputValue, setInputValue] = useState('');
  const [showNotification, setShowNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const [showUploadOptions, setShowUploadOptions] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [referenceLink, setReferenceLink] = useState('');
  const [showImageUpload, setShowImageUpload] = useState(false);
  const [showReferenceInput, setShowReferenceInput] = useState(false);
  const [presentationData, setPresentationData] = useState<{
    slides: Slide[];
    title: string;
  } | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() && !selectedFile) return;

    // Show email prompt if user is logged in
    if (user) {
      setShowEmailPrompt(true);
      return;
    }

    // Generate PPT without email if not logged in
    await generatePPT(false);
  };

  const generatePPT = async (sendViaEmail: boolean) => {
    setIsLoading(true);
    setError(null);
    setPresentationData(null);
    setShowEmailPrompt(false);

    try {
      const formData = new FormData();
      formData.append('text', inputValue.trim());
      formData.append('reference', referenceLink.trim());
      formData.append('send_via_email', sendViaEmail ? 'yes' : 'no');

      // Add username if user is logged in
      if (user?.username) {
        formData.append('username', user.username);
      }

      // Add document file if selected
      if (selectedFile) {
        formData.append('doc', selectedFile);
      }

      // Add images if selected
      if (selectedImages.length > 0) {
        selectedImages.forEach((image) => {
          formData.append('images', image);
        });
      }

      const response = await fetch('http://127.0.0.1:8000/generate-ppt', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      if (sendViaEmail) {
        // Handle email response
        const data = await response.json();
        setError(null);
        alert(data.message || 'PPT sent to your email successfully!');
        resetForm();
      } else {
        // Handle file download or presentation data
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          // If JSON response, it might be presentation data for viewer
          const data = await response.json();
          console.log('PPT Generation Response:', data);
          
          // Transform the API response into slides format
          if (data.slides && Array.isArray(data.slides)) {
            const transformedSlides = data.slides.map((slide: any, index: number) => ({
              id: index + 1,
              title: slide.title || `Slide ${index + 1}`,
              content: slide.content || slide.text || '',
              backgroundImage: slide.backgroundImage || slide.background
            }));
            setPresentationData({
              slides: transformedSlides,
              title: data.presentationTitle || data.title || 'Generated Presentation'
            });
          } else {
            // Fallback: create a single slide from the response
            setPresentationData({
              slides: [{
                id: 1,
                title: data.title || 'Generated Presentation',
                content: data.content || data.text || inputValue.trim(),
                backgroundImage: data.backgroundImage
              }],
              title: data.presentationTitle || data.title || 'Generated Presentation'
            });
          }
        } else {
          // Handle file download
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.style.display = 'none';
          a.href = url;
          a.download = 'generated_ppt.pptx';
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
          
          alert('PPT downloaded successfully!');
        }
        
        resetForm();
      }
      
    } catch (err) {
      console.error('Error generating PPT:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate presentation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setInputValue('');
    setSelectedFile(null);
    setSelectedImages([]);
    setReferenceLink('');
    setShowImageUpload(false);
    setShowReferenceInput(false);
    setShowUploadOptions(false);
  };

  const handleNotificationClick = () => {
    if (user) {
      return;
    }
    setShowNotification(!showNotification);
  };

  const handleLoginClick = () => {
    navigate('/login');
    setShowNotification(false);
  };

  const closePresentationViewer = () => {
    setPresentationData(null);
  };

  const handleEmailChoice = (choice: boolean) => {
    generatePPT(choice);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['.pdf', '.docx', '.txt'];
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      
      if (!allowedTypes.includes(fileExtension)) {
        setError('Please select a PDF, DOCX, or TXT file.');
        return;
      }

      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.');
        return;
      }

      setSelectedFile(file);
      setError(null);
    }
    setShowUploadOptions(false);
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    // Validate images
    const validImages = files.filter(file => {
      const isImage = file.type.startsWith('image/');
      const isValidSize = file.size <= 2 * 1024 * 1024; // 2MB limit
      return isImage && isValidSize;
    });

    if (validImages.length !== files.length) {
      setError('Please select valid image files (max 2MB each).');
      return;
    }

    setSelectedImages(prev => [...prev, ...validImages]);
    setError(null);
    setShowImageUpload(false);
  };

  const removeFile = () => {
    setSelectedFile(null);
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleReferenceSubmit = () => {
    if (referenceLink.trim()) {
      setShowReferenceInput(false);
    }
  };

  // Show presentation viewer if we have presentation data
  if (presentationData) {
    return (
      <PresentationViewer
        slides={presentationData.slides}
        presentationTitle={presentationData.title}
        onClose={closePresentationViewer}
      />
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white relative">
      {/* Top Right Notification - Only show if user is not logged in */}
      {!user && (
        <div className="absolute top-6 right-6 z-10">
          <button
            onClick={handleNotificationClick}
            className="relative p-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            <Bell className="w-6 h-6" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">1</span>
            </div>
          </button>

          {/* Notification Popup */}
          {showNotification && (
            <div className="absolute top-12 right-0 w-80 bg-white rounded-lg shadow-lg border border-gray-200 p-4 z-20">
              <div className="text-center">
                <p className="text-gray-700 mb-4">
                  Please sign in to maintain your chat history and logs
                </p>
                <button
                  onClick={handleLoginClick}
                  className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors font-medium"
                >
                  Login
                </button>
              </div>
              {/* Close overlay */}
              <div 
                className="fixed inset-0 -z-10" 
                onClick={() => setShowNotification(false)}
              />
            </div>
          )}
        </div>
      )}

      {/* Email Prompt Modal */}
      {showEmailPrompt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Delivery Options
              </h3>
              <p className="text-gray-600 mb-6">
                Would you like to receive your PPT via email?
              </p>
              
              <div className="flex space-x-3">
                <button
                  onClick={() => handleEmailChoice(true)}
                  disabled={isLoading}
                  className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-xl hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send via Email
                </button>
                <button
                  onClick={() => handleEmailChoice(false)}
                  disabled={isLoading}
                  className="flex-1 bg-gray-500 text-white py-3 px-4 rounded-xl hover:bg-gray-600 transition-colors font-medium disabled:opacity-50 flex items-center justify-center"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
              </div>
              
              <button
                onClick={() => setShowEmailPrompt(false)}
                disabled={isLoading}
                className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Options Modal */}
      {showUploadOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Upload Document</h3>
            <label className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-gray-600 text-center">Click to select document</span>
              <span className="text-sm text-gray-400 mt-1">PDF, DOCX, TXT (Max 10MB)</span>
              <input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>
            
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowUploadOptions(false)}
                className="flex-1 py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Upload Modal */}
      {showImageUpload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Add Images</h3>
            <label className="flex flex-col items-center p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 cursor-pointer transition-colors">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <span className="text-gray-600 text-center">Click to select images</span>
              <span className="text-sm text-gray-400 mt-1">Max 2MB per image</span>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
              />
            </label>
            
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowImageUpload(false)}
                className="flex-1 py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reference Link Modal */}
      {showReferenceInput && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4 text-center">Add Reference Link</h3>
            <input
              type="text"
              value={referenceLink}
              onChange={(e) => setReferenceLink(e.target.value)}
              placeholder="Enter reference link or text"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
            />
            
            <div className="flex space-x-3 mt-4">
              <button
                onClick={() => setShowReferenceInput(false)}
                className="flex-1 py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleReferenceSubmit}
                className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl w-full">
          {/* Welcome Message */}
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              What's on your mind today?
            </h2>
            <p className="text-lg text-gray-600">
              Transform your ideas into beautiful presentations
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          {/* Attached Files Display */}
          {(selectedFile || selectedImages.length > 0 || referenceLink) && (
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Attachments:</h4>
              
              {selectedFile && (
                <div className="flex items-center justify-between bg-white p-2 rounded border mb-2">
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 text-blue-600 mr-2" />
                    <span className="text-sm text-gray-700">{selectedFile.name}</span>
                  </div>
                  <button
                    onClick={removeFile}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {selectedImages.map((image, index) => (
                <div key={index} className="flex items-center justify-between bg-white p-2 rounded border mb-2">
                  <div className="flex items-center">
                    <Image className="w-4 h-4 text-green-600 mr-2" />
                    <span className="text-sm text-gray-700">{image.name}</span>
                  </div>
                  <button
                    onClick={() => removeImage(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              {referenceLink && (
                <div className="flex items-center justify-between bg-white p-2 rounded border">
                  <div className="flex items-center">
                    <Link className="w-4 h-4 text-purple-600 mr-2" />
                    <span className="text-sm text-gray-700 truncate">{referenceLink}</span>
                  </div>
                  <button
                    onClick={() => setReferenceLink('')}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask anything"
                className="w-full px-6 py-4 pr-32 text-lg border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                rows={3}
                disabled={isLoading}
              />
              <div className="absolute bottom-4 right-4 flex items-center space-x-1">
                {/* Document Upload Icon */}
                <button
                  type="button"
                  onClick={() => setShowUploadOptions(true)}
                  className="p-1.5 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50 rounded-lg hover:bg-gray-100"
                  disabled={isLoading}
                  title="Upload Document"
                >
                  <Plus className="w-4 h-4" />
                </button>
                
                {/* Image Upload Icon */}
                <button
                  type="button"
                  onClick={() => setShowImageUpload(true)}
                  className="p-1.5 text-gray-400 hover:text-green-500 transition-colors disabled:opacity-50 rounded-lg hover:bg-gray-100"
                  disabled={isLoading}
                  title="Upload Images"
                >
                  <Image className="w-4 h-4" />
                </button>
                
                {/* Reference Link Icon */}
                <button
                  type="button"
                  onClick={() => setShowReferenceInput(true)}
                  className="p-1.5 text-gray-400 hover:text-purple-500 transition-colors disabled:opacity-50 rounded-lg hover:bg-gray-100"
                  disabled={isLoading}
                  title="Add Reference Link"
                >
                  <Link className="w-4 h-4" />
                </button>
                
                {/* Send Button */}
                <button
                  type="submit"
                  disabled={(!inputValue.trim() && !selectedFile) || isLoading}
                  className="p-1.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center min-w-[32px]"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </form>

          {/* Loading State */}
          {isLoading && (
            <div className="mt-6 text-center">
              <div className="inline-flex items-center px-4 py-2 bg-blue-50 rounded-lg">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-blue-500" />
                <span className="text-blue-700 text-sm font-medium">
                  Generating your presentation...
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MainContent;