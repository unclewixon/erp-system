import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Admin.scss';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const LiveChats = () => {
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [loading, setLoading] = useState(true);
  const [replyMessage, setReplyMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [filter, setFilter] = useState('all'); // all, waiting, active, closed
  const [waitingCount, setWaitingCount] = useState(0);

  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  useEffect(() => {
    fetchChats();
    fetchWaitingCount();

    // Poll for updates
    pollInterval.current = setInterval(() => {
      fetchChats();
      fetchWaitingCount();
    }, 5000);

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [filter]);

  useEffect(() => {
    if (selectedChat) {
      scrollToBottom();
    }
  }, [selectedChat?.messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChats = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await axios.get(`${API_URL}/live-chat/admin/all`, { params });
      setChats(response.data.data || []);

      // Update selected chat if it exists
      if (selectedChat) {
        const updatedChat = response.data.data?.find(c => c._id === selectedChat._id);
        if (updatedChat) {
          setSelectedChat(updatedChat);
        }
      }
    } catch (error) {
      console.error('Error fetching chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWaitingCount = async () => {
    try {
      const response = await axios.get(`${API_URL}/live-chat/admin/waiting-count`);
      setWaitingCount(response.data.data?.count || 0);
    } catch (error) {
      console.error('Error fetching waiting count:', error);
    }
  };

  const handleSelectChat = async (chat) => {
    setSelectedChat(chat);

    // Assign chat if waiting
    if (chat.status === 'waiting') {
      try {
        await axios.post(`${API_URL}/live-chat/admin/${chat.sessionId}/assign`);
        fetchChats();
      } catch (error) {
        console.error('Error assigning chat:', error);
      }
    }
  };

  const handleSendReply = async (e) => {
    e.preventDefault();
    if (!replyMessage.trim() || !selectedChat) return;

    try {
      setSending(true);
      await axios.post(`${API_URL}/live-chat/admin/${selectedChat.sessionId}/reply`, {
        content: replyMessage.trim(),
      });
      setReplyMessage('');
      fetchChats();
    } catch (error) {
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleCloseChat = async (sessionId) => {
    try {
      await axios.post(`${API_URL}/live-chat/admin/${sessionId}/close`);
      toast.success('Chat closed');
      if (selectedChat?.sessionId === sessionId) {
        setSelectedChat(null);
      }
      fetchChats();
    } catch (error) {
      toast.error('Failed to close chat');
    }
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      waiting: { class: 'badge-warning', text: 'Waiting' },
      active: { class: 'badge-success', text: 'Active' },
      closed: { class: 'badge-secondary', text: 'Closed' },
    };
    return badges[status] || badges.waiting;
  };

  const filteredChats = chats.filter(chat => {
    if (filter === 'all') return true;
    return chat.status === filter;
  });

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading-state">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="admin-page live-chats-page">
      <div className="page-header">
        <div className="header-content">
          <h1>
            Live Chats
            {waitingCount > 0 && (
              <span className="waiting-badge">{waitingCount} waiting</span>
            )}
          </h1>
          <p>Manage live chat conversations with website visitors</p>
        </div>
      </div>

      <div className="chat-layout">
        {/* Chat List */}
        <div className="chat-list-panel">
          <div className="list-header">
            <div className="filter-tabs">
              <button
                className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`filter-tab ${filter === 'waiting' ? 'active' : ''}`}
                onClick={() => setFilter('waiting')}
              >
                Waiting {waitingCount > 0 && `(${waitingCount})`}
              </button>
              <button
                className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
                onClick={() => setFilter('active')}
              >
                Active
              </button>
              <button
                className={`filter-tab ${filter === 'closed' ? 'active' : ''}`}
                onClick={() => setFilter('closed')}
              >
                Closed
              </button>
            </div>
          </div>

          <div className="chat-list">
            {filteredChats.length === 0 ? (
              <div className="empty-list">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
                <p>No chats found</p>
              </div>
            ) : (
              filteredChats.map((chat) => (
                <div
                  key={chat._id}
                  className={`chat-item ${selectedChat?._id === chat._id ? 'selected' : ''} ${chat.status}`}
                  onClick={() => handleSelectChat(chat)}
                >
                  <div className="chat-avatar">
                    {chat.visitorName?.charAt(0).toUpperCase() || 'V'}
                  </div>
                  <div className="chat-info">
                    <div className="chat-name">{chat.visitorName || 'Visitor'}</div>
                    <div className="chat-preview">
                      {chat.messages?.[chat.messages.length - 1]?.content || 'No messages'}
                    </div>
                  </div>
                  <div className="chat-meta">
                    <span className="chat-time">
                      {formatTime(chat.updatedAt)}
                    </span>
                    <span className={`chat-status ${getStatusBadge(chat.status).class}`}>
                      {getStatusBadge(chat.status).text}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className="chat-window-panel">
          {selectedChat ? (
            <>
              <div className="window-header">
                <div className="visitor-info">
                  <div className="visitor-avatar">
                    {selectedChat.visitorName?.charAt(0).toUpperCase() || 'V'}
                  </div>
                  <div className="visitor-details">
                    <h3>{selectedChat.visitorName || 'Visitor'}</h3>
                    <div className="visitor-contact">
                      {selectedChat.visitorEmail && (
                        <span className="email">{selectedChat.visitorEmail}</span>
                      )}
                      {selectedChat.visitorPhone && (
                        <span className="phone">{selectedChat.visitorPhone}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="window-actions">
                  <span className={`status-badge ${getStatusBadge(selectedChat.status).class}`}>
                    {getStatusBadge(selectedChat.status).text}
                  </span>
                  {selectedChat.status !== 'closed' && (
                    <button
                      className="btn-close-chat"
                      onClick={() => handleCloseChat(selectedChat.sessionId)}
                    >
                      Close Chat
                    </button>
                  )}
                </div>
              </div>

              <div className="messages-area">
                {selectedChat.messages?.map((message, index) => (
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

              {selectedChat.status !== 'closed' && (
                <form className="reply-form" onSubmit={handleSendReply}>
                  <input
                    type="text"
                    placeholder="Type your reply..."
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                  />
                  <button type="submit" disabled={!replyMessage.trim() || sending}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </form>
              )}
            </>
          ) : (
            <div className="no-chat-selected">
              <div className="empty-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
              <h3>Select a Chat</h3>
              <p>Choose a conversation from the list to start responding</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LiveChats;
