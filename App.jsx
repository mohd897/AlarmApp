import React, { useState, useEffect, useRef } from 'react';

function generateMathProblem() {
  const operators = ['+', '-', '*', '/'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let num1, num2, answer;

  if (operator === '/') {
    num2 = Math.floor(Math.random() * 9) + 1; // 1-9
    answer = Math.floor(Math.random() * 10) + 1; // 1-10
    num1 = num2 * answer;
  } else if (operator === '*') {
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    answer = num1 * num2;
  } else if (operator === '-') {
    num1 = Math.floor(Math.random() * 20) + 1;
    num2 = Math.floor(Math.random() * num1) + 1; // ensure positive
    answer = num1 - num2;
  } else {
    num1 = Math.floor(Math.random() * 10) + 1;
    num2 = Math.floor(Math.random() * 10) + 1;
    answer = num1 + num2;
  }

  return { question: `${num1} ${operator} ${num2}`, answer: answer.toString() };
}

// Audio context reference
let audioCtx;
let oscillator;
let gainNode;

function startAlarmSound() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }

  if (oscillator) {
    oscillator.stop();
    oscillator.disconnect();
  }

  oscillator = audioCtx.createOscillator();
  gainNode = audioCtx.createGain();

  oscillator.type = 'square';
  oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitch
  
  // Create an annoying siren effect
  setInterval(() => {
    if(oscillator && audioCtx) {
      const time = audioCtx.currentTime;
      oscillator.frequency.setValueAtTime(800, time);
      oscillator.frequency.linearRampToValueAtTime(1200, time + 0.3);
      oscillator.frequency.linearRampToValueAtTime(800, time + 0.6);
    }
  }, 600);

  gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
  gainNode.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.1);

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  oscillator.start();
}

function stopAlarmSound() {
  if (oscillator && gainNode && audioCtx) {
    gainNode.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.1);
    setTimeout(() => {
      if(oscillator) {
        try {
          oscillator.stop();
        } catch(e) {}
        oscillator.disconnect();
        oscillator = null;
      }
    }, 100);
  }
}

function App() {
  const [alarmTime, setAlarmTime] = useState(localStorage.getItem('alarmTime') || '');
  const [isAlarmRinging, setIsAlarmRinging] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [problem, setProblem] = useState(null);
  const [userAnswer, setUserAnswer] = useState('');
  const [shake, setShake] = useState(false);
  const [questionsLeft, setQuestionsLeft] = useState(3);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now);

      if (alarmTime && !isAlarmRinging) {
        const [hours, minutes] = alarmTime.split(':');
        if (
          now.getHours() === parseInt(hours, 10) &&
          now.getMinutes() === parseInt(minutes, 10) &&
          now.getSeconds() === 0
        ) {
          triggerAlarm();
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [alarmTime, isAlarmRinging]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isAlarmRinging) {
        // Play an even more obnoxious sound or refocus if possible?
        // Can't really refocus via JS, but we can try to request fullscreen when they return
      }
    };
    
    // Prevent right click on alarm ring
    const handleContextMenu = (e) => {
      if (isAlarmRinging) e.preventDefault();
    };

    // Prevent escape key
    const handleKeyDown = (e) => {
      if (isAlarmRinging && e.key === 'Escape') {
        e.preventDefault();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAlarmRinging]);

  const triggerAlarm = () => {
    setIsAlarmRinging(true);
    setQuestionsLeft(3);
    setProblem(generateMathProblem());
    setUserAnswer('');
    setErrorCount(0);
    startAlarmSound();
    
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(e => console.log('Fullscreen failed:', e));
      }
    } catch(e) {}
  };

  const handleSetAlarm = (e) => {
    e.preventDefault();
    const time = e.target.time.value;
    if (time) {
      setAlarmTime(time);
      localStorage.setItem('alarmTime', time);
    }
  };

  const clearAlarm = () => {
    setAlarmTime('');
    localStorage.removeItem('alarmTime');
  };

  const handleAnswerSubmit = (e) => {
    e.preventDefault();
    if (userAnswer === problem.answer) {
      if (questionsLeft > 1) {
        setQuestionsLeft(prev => prev - 1);
        setProblem(generateMathProblem());
        setUserAnswer('');
      } else {
        // Alarm solved!
        setIsAlarmRinging(false);
        stopAlarmSound();
        try {
          if (document.exitFullscreen) {
            document.exitFullscreen().catch(e => console.log('Exit fullscreen failed', e));
          }
        } catch(e) {}
        
        // Don't clear alarm time so it rings next day, but for demo let's keep it
      }
    } else {
      setShake(true);
      setErrorCount(prev => prev + 1);
      setTimeout(() => setShake(false), 500);
      setUserAnswer('');
    }
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getCountdown = () => {
    if (!alarmTime) return null;
    const now = new Date();
    const [hours, minutes] = alarmTime.split(':');
    let alarmDate = new Date(now);
    alarmDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);

    if (alarmDate <= now) {
      // If alarm time is in the past for today, it's for tomorrow
      alarmDate.setDate(alarmDate.getDate() + 1);
    }

    const diff = alarmDate - now;
    const h = Math.floor(diff / (1000 * 60 * 60));
    const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const s = Math.floor((diff % (1000 * 60)) / 1000);

    return `${h}h ${m}m ${s}s`;
  };

  if (isAlarmRinging) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-red-600 text-white w-full h-full">
        <div className="absolute inset-0 bg-red-900 opacity-50 animate-pulse pointer-events-none"></div>
        <div className="z-10 text-center w-full max-w-md px-6">
          <h1 className="text-6xl font-black mb-4 tracking-wider uppercase animate-bounce drop-shadow-lg">Wake Up!</h1>
          
          <div className="bg-black/40 backdrop-blur-md rounded-2xl p-8 shadow-2xl border-4 border-red-400/50">
            <p className="text-xl mb-2 font-medium text-red-100 uppercase tracking-widest">
              Questions left: {questionsLeft}
            </p>
            <div className="text-5xl font-bold mb-8 py-4 bg-white/10 rounded-lg shadow-inner font-mono tracking-widest">
              {problem?.question} = ?
            </div>
            
            <form onSubmit={handleAnswerSubmit} className="flex flex-col gap-4">
              <input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                className={`w-full text-center text-4xl p-4 rounded-xl text-slate-900 font-bold focus:outline-none focus:ring-8 focus:ring-red-400 transition-all ${shake ? 'animate-[shake_0.5s_ease-in-out]' : ''}`}
                placeholder="Answer"
                autoFocus
              />
              <button
                type="submit"
                className="w-full bg-slate-900 hover:bg-black text-white text-2xl font-bold py-5 rounded-xl uppercase tracking-wider transition-colors border border-slate-700 shadow-[0_0_20px_rgba(0,0,0,0.5)] active:scale-95"
              >
                Submit to Stop
              </button>
            </form>

            {errorCount > 0 && (
               <p className="mt-4 text-red-200 font-bold text-lg animate-pulse">
                 Wrong answer! Sound continues...
               </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-slate-900 text-slate-50">
      <div className="w-full max-w-md bg-slate-800 rounded-3xl shadow-2xl border border-slate-700 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
        
        <div className="p-8">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black mb-2 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">
              Unstoppable
            </h1>
            <h2 className="text-lg font-medium text-slate-400 uppercase tracking-widest">
              Alarm App
            </h2>
          </div>

          <div className="mb-10 text-center">
            <div className="text-6xl font-mono font-light tracking-tighter text-slate-100 mb-2 drop-shadow-md">
              {formatTime(currentTime)}
            </div>
            <div className="text-sm font-medium text-slate-500">
              Current Time
            </div>
          </div>

          <form onSubmit={handleSetAlarm} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="time" className="block text-sm font-medium text-slate-300 ml-1">
                Set Alarm Time
              </label>
              <input
                type="time"
                id="time"
                name="time"
                defaultValue={alarmTime}
                required
                className="w-full bg-slate-900 border-2 border-slate-700 text-slate-100 text-xl rounded-xl p-4 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors cursor-pointer"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-4 rounded-xl shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all active:scale-95 text-lg uppercase tracking-wider"
            >
              Set Alarm
            </button>
          </form>

          {alarmTime && (
            <div className="mt-8 bg-slate-900/50 rounded-xl p-5 border border-slate-700/50 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Active Alarm</p>
                  <p className="text-2xl font-mono text-emerald-400 font-bold">{alarmTime}</p>
                </div>
                <button 
                  onClick={clearAlarm}
                  className="p-3 text-slate-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                  title="Clear Alarm"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              <div className="bg-slate-800/80 rounded-lg p-3 text-center border border-slate-700">
                <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-1">Time until alarm</p>
                <p className="text-xl font-mono text-blue-400 font-bold">{getCountdown()}</p>
              </div>
            </div>
          )}
          
          <div className="mt-10 pt-6 border-t border-slate-700/50">
            <button 
               type="button" 
               onClick={triggerAlarm} 
               className="w-full text-slate-500 hover:text-slate-300 text-sm font-medium transition-colors"
            >
              Test Alarm Demo
            </button>
          </div>

        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-10px); }
          20%, 40%, 60%, 80% { transform: translateX(10px); }
        }
      `}} />
    </div>
  );
}

export default App;
