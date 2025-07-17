import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import MainContent from '../components/MainContent';

const Home: React.FC = () => {
  const [activeSection, setActiveSection] = useState('newchat');

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar 
        activeSection={activeSection} 
        onSectionChange={setActiveSection} 
      />
      <MainContent />
    </div>
  );
};

export default Home;