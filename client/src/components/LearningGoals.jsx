import { useGSAP } from '@gsap/react'
import gsap from 'gsap'

function LearningGoals({ goals, loading }) {
  useGSAP(() => {
    if (!loading && goals.length > 0) {
      gsap.from('.goal-card', {
        duration: 0.6,
        y: 30,
        opacity: 0,
        stagger: 0.1,
        ease: 'power2.out'
      })
    }
  }, [loading, goals])

  if (loading) {
    return <div className="loading">Loading your learning goals...</div>
  }

  return (
    <div className="learning-goals">
      <h2>Your Learning Journey</h2>
      <div className="goals-grid">
        {goals.map(goal => (
          <div key={goal.id} className="goal-card">
            <h3>{goal.title}</h3>
            <p className="category">{goal.category}</p>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${goal.progress}%` }}
              />
            </div>
            <span className="progress-text">{goal.progress}% Complete</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default LearningGoals