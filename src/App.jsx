import './App.css'
import { useState, useEffect } from 'react'
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from 'firebase/auth'
import { getFirestore, collection, addDoc, query, orderBy, serverTimestamp, onSnapshot, updateDoc, doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore'
import { auth, app } from '../firebase'
import EmojiPicker from 'emoji-picker-react'

const db = getFirestore(app)

function App() {c
  const [user, setUser] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [emojiPickerVisible, setEmojiPickerVisible] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [isPollMode, setIsPollMode] = useState(false)
  const [pollQuestion, setPollQuestion] = useState("")
  const [pollOptions, setPollOptions] = useState(["", ""])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user)
        const userRef = doc(db, "users", user.uid)
        getDoc(userRef).then(docSnap => {
          if (docSnap.exists()) {
            setIsAdmin(docSnap.data().isAdmin || false)
          } else {
            setDoc(userRef, {
              displayName: user.displayName,
              email: user.email,
              isAdmin: false
            })
          }
        })
      } else {
        setUser(null)
        setIsAdmin(false)
      }
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const q = query(collection(db, "messages"), orderBy("timestamp"))
    const unsubscribe = onSnapshot(q, snapshot => {
      const updatedMessages = snapshot.docs.map(doc => ({ id: doc.id, data: doc.data() }))
      setMessages(updatedMessages)
    })
    return unsubscribe
  }, [])

  const sendMessage = async () => {
    if (user && newMessage.trim()) {
      await addDoc(collection(db, "messages"), {
        uid: user.uid,
        displayName: user.displayName,
        text: newMessage,
        likes: 0,
        likedBy: [],
        timestamp: serverTimestamp()
      })
      setNewMessage("")
    }
  }

  const sendPoll = async () => {
    if (!isAdmin) return
    if (user && pollQuestion && pollOptions.every(opt => opt.trim() !== "")) {
      const optionsMap = {}
      pollOptions.forEach((opt, idx) => optionsMap[idx] = 0)
      await addDoc(collection(db, "messages"), {
        uid: user.uid,
        displayName: user.displayName,
        isPoll: true,
        question: pollQuestion,
        options: pollOptions,
        votes: optionsMap,
        votedBy: {},
        timestamp: serverTimestamp()
      })
      setPollQuestion("")
      setPollOptions(["", ""])
      setIsPollMode(false)
    }
  }

  const answerPoll = async (messageId, option) => {
    if (!user) return
    try {
      const messageRef = doc(db, "messages", messageId)
      const messageSnap = await getDoc(messageRef)
      if (!messageSnap.exists()) return

      const msgData = messageSnap.data()
      const votedBy = msgData.votedBy || {}

      if (votedBy[user.uid]) return

      const updatedVotes = { ...msgData.votes }
updatedVotes[option] = (updatedVotes[option] || 0) + 1
const updatedVotedBy = { ...votedBy, [user.uid]: option }


      await updateDoc(messageRef, {
        votes: updatedVotes,
        votedBy: updatedVotedBy
      })
    } catch (error) {
      console.error("שגיאה בהצבעה לסקר:", error)
    }
  }

  const addLike = async (messageId, likes, likedBy) => {
    if (likedBy.includes(user.uid)) return
    const messageRef = doc(db, "messages", messageId)
    await updateDoc(messageRef, {
      likes: likes + 1,
      likedBy: [...likedBy, user.uid]
    })
  }

  const deleteMessage = async (messageId) => {
    if (isAdmin) {
      const messageRef = doc(db, "messages", messageId)
      await deleteDoc(messageRef)
    }
  }

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider()
    try {
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.log("Error during Google login: ", error)
    }
  }

  return (
    <div className="whatsapp-chat-embed">
      {user ? (
        <>
          <div className="chat-header d-flex justify-content-between align-items-center px-3 py-2 bg-warning text-dark">
            <strong>צ'אט רדיו BGU</strong>
            <button className="btn btn-sm btn-outline-dark" onClick={() => auth.signOut()}>התנתקות</button>
          </div>

          <div className="chat-body p-3 overflow-auto">
            {messages.map(msg => {
              const isMine = msg.data.uid === user.uid
              return (
                <div key={msg.id} className={`d-flex mb-2 ${isMine ? 'justify-content-end' : 'justify-content-start'}`}>
                  <div className={`p-2 rounded shadow-sm ${isMine ? 'bg-warning text-dark' : 'bg-white text-dark'}`} style={{ maxWidth: '75%' }}>
                    {msg.data.isPoll ? (
                      <>
                        <strong>{msg.data.displayName}</strong> שאל: {msg.data.question}
                        <div className="mt-2">
                        {msg.data.options.map((text, idx) => {
  const votedBy = msg.data.votedBy || {}
  const userVote = votedBy[user?.uid]
  const hasVoted = userVote !== undefined
  const isUserChoice = userVote === idx
  const voteCount = msg.data.votes?.[idx] || 0

  return (
    <button
      key={idx}
      disabled={hasVoted}
      onClick={() => answerPoll(msg.id, idx)}
      className={`btn btn-sm me-2 mt-1 ${isUserChoice ? 'btn-dark text-white' : 'btn-outline-dark'}`}
    >
      {isUserChoice ? '✔ ' : ''}{text} ({voteCount})
    </button>
  )
})}

                        </div>
                        {isAdmin && (
      <div className="mt-2">
        <button
          className="btn btn-sm btn-outline-secondary"
          onClick={() => deleteMessage(msg.id)}
        >
          🗑️ 
        </button>
      </div>
    )}

                      </>
                    ) : (
                      <>
                        <strong>{msg.data.displayName}</strong>: {msg.data.text}
                        <div className="mt-1">
                          <button className="btn btn-sm btn-outline-danger me-2" onClick={() => addLike(msg.id, msg.data.likes, msg.data.likedBy)}>❤️</button>
                          <span className="text-muted">{msg.data.likes} לייקים</span>
                          {isAdmin && (
                            <button className="btn btn-sm btn-outline-secondary ms-2" onClick={() => deleteMessage(msg.id)}>🗑️</button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="chat-input p-2 border-top d-flex align-items-center bg-light">
            <button className="btn btn-outline-secondary me-2" onClick={() => setEmojiPickerVisible(!emojiPickerVisible)}>😀</button>
            <input
              type="text"
              className="form-control me-2"
              placeholder="כתוב הודעה..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <button className="btn btn-warning" onClick={sendMessage}>שלח</button>
          </div>

          {emojiPickerVisible && (
            <div className="px-3 py-1">
              <EmojiPicker
                onEmojiClick={(emojiData) => {
                  setNewMessage(prev => prev + emojiData.emoji)
                  setEmojiPickerVisible(false)
                }}
              />
            </div>
          )}

          {isAdmin && (
            <div className="px-3 py-2 bg-light">
              <button className="btn btn-sm btn-outline-dark" onClick={() => setIsPollMode(!isPollMode)}>יצירת סקר 📊</button>
            </div>
          )}

          {isPollMode && (
            <div className="px-3 py-2 bg-white border-top">
              <input
                type="text"
                className="form-control mb-2"
                placeholder="שאלה לסקר"
                value={pollQuestion}
                onChange={(e) => setPollQuestion(e.target.value)}
              />
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="input-group mb-2">
                  <input
                    type="text"
                    className="form-control"
                    value={opt}
                    placeholder={`אפשרות ${idx + 1}`}
                    onChange={(e) => {
                      const newOptions = [...pollOptions]
                      newOptions[idx] = e.target.value
                      setPollOptions(newOptions)
                    }}
                  />
                  {pollOptions.length > 2 && (
                    <button className="btn btn-outline-danger" onClick={() => {
                      const newOptions = [...pollOptions]
                      newOptions.splice(idx, 1)
                      setPollOptions(newOptions)
                    }}>❌</button>
                  )}
                </div>
              ))}
              <button className="btn btn-outline-secondary me-2" onClick={() => setPollOptions([...pollOptions, ""])}>➕ הוסף</button>
              <button className="btn btn-success" onClick={sendPoll}>שלח סקר</button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center p-4">
          <button className="btn btn-success" onClick={handleGoogleLogin}>התחברות עם Google</button>
        </div>
      )}
    </div>
  )
}

export default App
