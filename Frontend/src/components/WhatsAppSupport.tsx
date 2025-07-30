import React from 'react';

const WhatsAppSupport: React.FC = () => {
  const handleWhatsAppClick = () => {
    const phoneNumber = '+12163153582';
    const message = 'Hello! I need support with the casino games.';
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50">
      <button
        onClick={handleWhatsAppClick}
        className="group relative w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 transition-all duration-300 hover:scale-110"
        style={{
          animation: 'float 3s ease-in-out infinite'
        }}
      >
        <img
          src="/images/wp_support.png"
          alt="WhatsApp Support"
          className="w-full h-full object-contain drop-shadow-lg"
        />
        
        {/* Pulse effect */}
        <div className="absolute inset-0 rounded-full bg-green-500 opacity-20 animate-ping"></div>
        
        {/* Hover tooltip */}
        <div className="absolute bottom-full right-0 mb-2 px-2 sm:px-3 py-1 sm:py-2 bg-gray-900 text-white text-xs sm:text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
          Need Help? Chat with us!
          <div className="absolute top-full right-2 sm:right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
        </div>
      </button>
      
      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) scale(1);
          }
          50% {
            transform: translateY(-10px) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

export default WhatsAppSupport; 