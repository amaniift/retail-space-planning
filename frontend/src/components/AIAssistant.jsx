import React, { useState, useRef, useEffect } from 'react'
import { useStore } from '../store'

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const aiMessages = useStore((state) => state.aiMessages)
  const sendAiMessage = useStore((state) => state.sendAiMessage)
  const scrollRef = useRef()

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [aiMessages])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!input.trim()) return
    const prompt = input.trim()
    setInput('')
    setIsTyping(true)
    await sendAiMessage(prompt)
    setIsTyping(false)
  }

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="ai-toggle-btn"
      >
        {isOpen ? '×' : '✨'}
      </button>

      {/* Sidebar Panel */}
      <div className={`ai-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="ai-header">
          <div>
            <h2><span className="highlight">AI</span> Assistant</h2>
            <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
              Smart Planogramming Assistant
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer' }}>
            ×
          </button>
        </div>

        {/* Chat History */}
        <div ref={scrollRef} className="ai-chat-history">
          {aiMessages.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <div style={{ width: '64px', height: '64px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyCenter: 'center', margin: '0 auto 16px' }}>
                <span style={{ fontSize: '1.5rem' }}>✨</span>
              </div>
              <p style={{ color: '#cbd5e1', fontWeight: '500' }}>How can I help you today?</p>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '8px', lineHeight: '1.6' }}>
                "Create a 4-shelf gondola for beverages"<br/>
                "Optimize the current planogram"<br/>
                "Add more snack items"
              </p>
            </div>
          )}
          
          {aiMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`ai-message ${msg.role === 'user' ? 'user' : 'model'}`}
            >
              {msg.content}
              {msg.results && msg.results.length > 0 && (
                <div className="ai-execution-results" style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  {msg.results.map((res, ridx) => (
                    <div key={ridx} className="ai-execution-badge">
                      <span className="ai-dot" />
                      Executed: {res.action}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {isTyping && (
            <div className="typing-indicator">
              <div className="typing-dot" />
              <div className="typing-dot" />
              <div className="typing-dot" />
            </div>
          )}
        </div>

        {/* Input Area */}
        <form onSubmit={handleSubmit} className="ai-input-area">
          <div className="ai-input-container">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything..."
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="ai-send-btn"
            >
              →
            </button>
          </div>
          <div style={{ fontSize: '10px', color: '#64748b', marginTop: '12px', textAlign: 'center' }}>
            AI Assistant can create fixtures and optimize layouts.
          </div>
        </form>
      </div>
    </>
  )
}
