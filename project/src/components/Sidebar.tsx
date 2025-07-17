import React, { useState, useEffect } from 'react';
import { MessageSquarePlus, Search, FolderOpen, LogOut, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ChatHistory {
  id: string;
  title: string;
  timestamp: string;
  preview: string;
}

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange }) => {
  const { user, logout } = useAuth();
  const [chatHistory, setChatHistory] = useState<ChatHistory[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredChats, setFilteredChats] = useState<ChatHistory[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const menuItems = [
    { id: 'newchat', icon: MessageSquarePlus, label: 'New chat' },
    { id: 'search', icon: Search, label: 'Search chats' },
    { id: 'projects', icon: FolderOpen, label: 'Projects' },
  ];

  // Fetch user chat history when user logs in
  useEffect(() => {
    if (user?.username) {
      fetchChatHistory(user.username);
    } else {
      setChatHistory([]);
      setFilteredChats([]);
    }
  }, [user]);

  // Filter chats based on search query
  useEffect(() => {
    if (searchQuery.trim()) {
      const filtered = chatHistory.filter(chat =>
        chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chat.preview.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredChats(filtered);
    } else {
      setFilteredChats(chatHistory);
    }
  }, [searchQuery, chatHistory]);

  const fetchChatHistory = async (username: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/user-history/${username}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Chat history response:', data);
        
        // Handle the response format from your API
        if (data.history && Array.isArray(data.history)) {
          // Transform API response to match our ChatHistory interface
          const transformedHistory: ChatHistory[] = data.history.map((item: string, index: number) => ({
            id: `chat_${index + 1}`,
            title: `Chat ${index + 1}`,
            timestamp: new Date().toISOString(), // You might want to store actual timestamps in your API
            preview: item.length > 100 ? item.substring(0, 100) + '...' : item
          }));
          setChatHistory(transformedHistory);
        } else if (Array.isArray(data)) {
          // If data is directly an array
          const transformedHistory: ChatHistory[] = data.map((item: any, index: number) => ({
            id: item.id || `chat_${index + 1}`,
            title: item.title || `Chat ${index + 1}`,
            timestamp: item.timestamp || new Date().toISOString(),
            preview: item.preview || item.content || item.text || 'No preview available'
          }));
          setChatHistory(transformedHistory);
        } else {
          // Fallback for other formats
          setChatHistory([]);
        }
      } else {
        console.error('Failed to fetch chat history:', response.status);
        setChatHistory([]);
      }
    } catch (error) {
      console.error('Error fetching chat history:', error);
      setChatHistory([]);
    }
  };

  const handleSearchClick = () => {
    if (activeSection === 'search') {
      setIsSearching(!isSearching);
    } else {
      onSectionChange('search');
      setIsSearching(true);
    }
  };

  const handleLogout = () => {
    logout();
    onSectionChange('newchat');
    setSearchQuery('');
    setIsSearching(false);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col h-screen">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Text2PPT</h1>
            <p className="text-sm text-gray-500 mt-1">Your presentations made easy</p>
          </div>
        </div>
      </div>

      {/* User Info & Logout */}
      {user && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{user.fullName || user.username}</p>
                <p className="text-xs text-gray-500">@{user.username}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 overflow-y-auto">
        <ul className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.id}>
                <button
                  onClick={item.id === 'search' ? handleSearchClick : () => onSectionChange(item.id)}
                  className={`w-full flex items-center px-3 py-2.5 text-left rounded-lg transition-colors duration-200 ${
                    activeSection === item.id
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>

        {/* Search Input */}
        {isSearching && activeSection === 'search' && (
          <div className="mt-4">
            <input
              type="text"
              placeholder="Search your chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        )}

        {/* Chats Section */}
        <div className="mt-8">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
            {activeSection === 'search' && searchQuery ? 'Search Results' : 'Chats'}
          </h3>
          
          {user ? (
            <div className="space-y-2">
              {(activeSection === 'search' ? filteredChats : chatHistory).length > 0 ? (
                (activeSection === 'search' ? filteredChats : chatHistory).map((chat) => (
                  <div
                    key={chat.id}
                    className="p-3 rounded-lg hover:bg-gray-100 cursor-pointer transition-colors group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600">
                          {chat.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                          {chat.preview}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                        {formatTimestamp(chat.timestamp)}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500 italic">
                  {activeSection === 'search' && searchQuery 
                    ? 'No chats found matching your search'
                    : 'No recent chats'
                  }
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-500 italic">
              Please sign in to view your chat history
            </div>
          )}
        </div>
      </nav>
    </div>
  );
};

export default Sidebar;