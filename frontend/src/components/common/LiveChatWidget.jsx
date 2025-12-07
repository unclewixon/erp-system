import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './LiveChatWidget.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const LiveChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [step, setStep] = useState('intro'); // intro, form, chat
  const [sessionId, setSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [visitorInfo, setVisitorInfo] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    // Check for existing session
    const existingSession = localStorage.getItem('liveChatSession');
    if (existingSession) {
      const session = JSON.parse(existingSession);
      setSessionId(session.sessionId);
      setVisitorInfo({ name: session.name, email: session.email, phone: session.phone });
      setStep('chat');
      fetchMessages(session.sessionId);
    }
  }, []);

  useEffect(() => {
    if (step === 'chat' && sessionId) {
      // Start polling for new messages
      pollInterval.current = setInterval(() => {
        fetchMessages(sessionId);
      }, 3000);

      return () => {
        if (pollInterval.current) {
          clearInterval(pollInterval.current);
        }
      };
    }
  }, [step, sessionId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async (sid) => {
    try {
      const response = await axios.get(`${API_URL}/live-chat/${sid}`);
      if (response.data.success) {
        setMessages(response.data.data.messages || []);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleStartChat = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await axios.post(`${API_URL}/live-chat/start`, {
        visitorName: visitorInfo.name,
        visitorEmail: visitorInfo.email,
        visitorPhone: visitorInfo.phone,
      });

      if (response.data.success) {
        const { sessionId: newSessionId, messages: initialMessages } = response.data.data;
        setSessionId(newSessionId);
        setMessages(initialMessages || []);
        setStep('chat');

        // Save session
        localStorage.setItem('liveChatSession', JSON.stringify({
          sessionId: newSessionId,
          name: visitorInfo.name,
          email: visitorInfo.email,
          phone: visitorInfo.phone,
        }));
      }
    } catch (error) {
      console.error('Error starting chat:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !sessionId) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    // Optimistically add message
    setMessages(prev => [...prev, {
      sender: 'visitor',
      content: messageContent,
      timestamp: new Date().toISOString(),
    }]);

    try {
      await axios.post(`${API_URL}/live-chat/${sessionId}/message`, {
        content: messageContent,
      });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEndChat = async () => {
    if (sessionId) {
      try {
        await axios.post(`${API_URL}/live-chat/${sessionId}/close`);
      } catch (error) {
        console.error('Error closing chat:', error);
      }
    }

    // Clear session
    localStorage.removeItem('liveChatSession');
    setSessionId(null);
    setMessages([]);
    setStep('intro');
    setIsOpen(false);
    setVisitorInfo({ name: '', email: '', phone: '' });
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) {
    return (
      <button className="chat-trigger" onClick={() => setIsOpen(true)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <span className="trigger-text">Chat with us</span>
      </button>
    );
  }

  return (
    <div className={`chat-widget ${isMinimized ? 'minimized' : ''}`}>
      {/* Header */}
      <div className="chat-header">
        <div className="header-info">
          <div className="avatar">
            <span>E</span>
          </div>
          <div className="header-text">
            <h4>EnterprisePro Support</h4>
            <span className="status">
              <span className="status-dot"></span>
              Online
            </span>
          </div>
        </div>
        <div className="header-actions">
          <button onClick={() => setIsMinimized(!isMinimized)} className="btn-minimize">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button onClick={() => setIsOpen(false)} className="btn-close">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {!isMinimized && (
        <div className="chat-body">
          {/* Intro Step */}
          {step === 'intro' && (
            <div className="intro-content">
              <div className="intro-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>Hello there!</h3>
              <p>How can we help you today? Start a conversation with our team.</p>
              <button className="btn-start" onClick={() => setStep('form')}>
                Start Conversation
              </button>
            </div>
          )}

          {/* Form Step */}
          {step === 'form' && (
            <form className="info-form" onSubmit={handleStartChat}>
              <p>Please provide your details to start chatting:</p>
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Your Name *"
                  value={visitorInfo.name}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, name: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={visitorInfo.email}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, email: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={visitorInfo.phone}
                  onChange={(e) => setVisitorInfo({ ...visitorInfo, phone: e.target.value })}
                />
              </div>
              <button type="submit" className="btn-submit" disabled={loading}>
                {loading ? 'Starting...' : 'Start Chat'}
              </button>
              <button type="button" className="btn-back" onClick={() => setStep('intro')}>
                Go Back
              </button>
            </form>
          )}

          {/* Chat Step */}
          {step === 'chat' && (
            <>
              <div className="messages-container">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`message ${message.sender === 'visitor' ? 'visitor' : 'admin'}`}
                  >
                    <div className="message-content">{message.content}</div>
                    <div className="message-time">{formatTime(message.timestamp)}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form className="message-form" onSubmit={handleSendMessage}>
                <input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" disabled={!newMessage.trim()}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </form>

              <button className="btn-end-chat" onClick={handleEndChat}>
                End Chat
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default LiveChatWidget;
