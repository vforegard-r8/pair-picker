import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import './App.css';

function App({ user, onLogout }) {
  const [people, setPeople] = useState([]);
  const [unpaired, setUnpaired] = useState([]);
  const [pairs, setPairs] = useState([]);
  const [history, setHistory] = useState([]);
  const [newPersonName, setNewPersonName] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  // Load people and history on mount
  useEffect(() => {
    loadPeople();
    loadHistory();
  }, []);

  const loadPeople = async () => {
    try {
      const response = await fetch('/api/people', {
        credentials: 'include'
      });
      const data = await response.json();
      setPeople(data);
      setUnpaired(data);
    } catch (error) {
      console.error('Error loading people:', error);
    }
  };

  const loadHistory = async () => {
    try {
      const response = await fetch('/api/history', {
        credentials: 'include'
      });
      const data = await response.json();
      setHistory(data);
    } catch (error) {
      console.error('Error loading history:', error);
    }
  };

  const savePeople = async (updatedPeople) => {
    try {
      await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ people: updatedPeople }),
        credentials: 'include'
      });
    } catch (error) {
      console.error('Error saving people:', error);
    }
  };

  const addPerson = () => {
    if (newPersonName.trim()) {
      const updated = [...people, newPersonName.trim()];
      setPeople(updated);
      setUnpaired(updated);
      savePeople(updated);
      setNewPersonName('');
    }
  };

  const removePerson = (name) => {
    const updated = people.filter(p => p !== name);
    setPeople(updated);
    setUnpaired(updated);
    setPairs([]);
    savePeople(updated);
  };

  const smartPair = async () => {
    try {
      const response = await fetch('/api/pairs/smart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      const smartPairs = await response.json();
      setPairs(smartPairs);
      setUnpaired([]);
    } catch (error) {
      console.error('Error generating smart pairs:', error);
    }
  };

  const savePairs = async () => {
    if (pairs.length === 0) return;

    try {
      await fetch('/api/pairs/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pairs }),
        credentials: 'include'
      });
      await loadHistory();
      alert('Pairs saved to history!');
    } catch (error) {
      console.error('Error saving pairs:', error);
    }
  };

  const resetPairs = () => {
    setPairs([]);
    setUnpaired([...people]);
  };

  const deleteHistorySession = async (id) => {
    try {
      await fetch(`/api/history/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      await loadHistory();
    } catch (error) {
      console.error('Error deleting history:', error);
    }
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;

    // Moving within unpaired
    if (source.droppableId === 'unpaired' && destination.droppableId === 'unpaired') {
      const items = Array.from(unpaired);
      const [reorderedItem] = items.splice(source.index, 1);
      items.splice(destination.index, 0, reorderedItem);
      setUnpaired(items);
      return;
    }

    // Moving from unpaired to a pair
    if (source.droppableId === 'unpaired' && destination.droppableId.startsWith('pair-')) {
      const pairIndex = parseInt(destination.droppableId.split('-')[1]);
      const person = unpaired[source.index];

      const newUnpaired = unpaired.filter((_, i) => i !== source.index);
      const newPairs = [...pairs];

      if (pairIndex >= newPairs.length) {
        newPairs.push([person]);
      } else {
        newPairs[pairIndex].push(person);
      }

      setUnpaired(newUnpaired);
      setPairs(newPairs);
      return;
    }

    // Moving from pair to unpaired
    if (source.droppableId.startsWith('pair-') && destination.droppableId === 'unpaired') {
      const pairIndex = parseInt(source.droppableId.split('-')[1]);
      const personIndex = source.index;
      const person = pairs[pairIndex][personIndex];

      const newPairs = pairs.map((pair, i) =>
        i === pairIndex ? pair.filter((_, j) => j !== personIndex) : pair
      ).filter(pair => pair.length > 0);

      const newUnpaired = [...unpaired];
      newUnpaired.splice(destination.index, 0, person);

      setPairs(newPairs);
      setUnpaired(newUnpaired);
      return;
    }

    // Moving between pairs
    if (source.droppableId.startsWith('pair-') && destination.droppableId.startsWith('pair-')) {
      const sourcePairIndex = parseInt(source.droppableId.split('-')[1]);
      const destPairIndex = parseInt(destination.droppableId.split('-')[1]);

      if (sourcePairIndex === destPairIndex) return;

      const person = pairs[sourcePairIndex][source.index];
      const newPairs = pairs.map((pair, i) =>
        i === sourcePairIndex ? pair.filter((_, j) => j !== source.index) : pair
      ).filter(pair => pair.length > 0);

      if (destPairIndex >= newPairs.length) {
        newPairs.push([person]);
      } else {
        newPairs[destPairIndex].push(person);
      }

      setPairs(newPairs);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <div className="header-content">
          <div>
            <h1>👥 Pair Picker</h1>
            <p>Smart pair programming tool with history tracking</p>
          </div>
          <div className="user-info">
            <span className="user-email">{user.teamName || user.email}</span>
            <button onClick={onLogout} className="logout-btn">Logout</button>
          </div>
        </div>
      </header>

      <div className="main-content">
        <div className="people-section">
          <h2>Team Members</h2>
          <div className="add-person">
            <input
              type="text"
              placeholder="Enter name..."
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addPerson()}
            />
            <button onClick={addPerson}>Add</button>
          </div>
          <ul className="people-list">
            {people.map((person, index) => (
              <li key={index}>
                {person}
                <button onClick={() => removePerson(person)} className="remove-btn">×</button>
              </li>
            ))}
          </ul>
        </div>

        <DragDropContext onDragEnd={onDragEnd}>
          <div className="pairing-section">
            <div className="actions">
              <button onClick={smartPair} className="smart-btn">Smart Pair</button>
              <button onClick={resetPairs} className="reset-btn">Reset</button>
              <button onClick={savePairs} className="save-btn" disabled={pairs.length === 0}>Save Pairs</button>
            </div>

            <div className="pairing-area">
              <Droppable droppableId="unpaired">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`unpaired-zone ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                  >
                    <h3>Unpaired ({unpaired.length})</h3>
                    {unpaired.map((person, index) => (
                      <Draggable key={person} draggableId={person} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`person-card ${snapshot.isDragging ? 'dragging' : ''}`}
                          >
                            {person}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              <div className="pairs-zone">
                <h3>Pairs ({pairs.length})</h3>
                {pairs.map((pair, pairIndex) => (
                  <Droppable key={pairIndex} droppableId={`pair-${pairIndex}`}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`pair-card ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                      >
                        <div className="pair-number">Pair {pairIndex + 1}</div>
                        {pair.map((person, personIndex) => (
                          <Draggable key={person} draggableId={`${person}-pair-${pairIndex}`} index={personIndex}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={`person-card ${snapshot.isDragging ? 'dragging' : ''}`}
                              >
                                {person}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                ))}
              </div>
            </div>
          </div>
        </DragDropContext>
      </div>

      <div className="history-section">
        <button onClick={() => setShowHistory(!showHistory)} className="history-toggle">
          {showHistory ? 'Hide' : 'Show'} History ({history.length})
        </button>
        {showHistory && (
          <div className="history-list">
            {history.slice().reverse().map((session) => (
              <div key={session.id} className="history-item">
                <div className="history-header">
                  <span className="history-date">
                    {new Date(session.date).toLocaleString()}
                  </span>
                  <button onClick={() => deleteHistorySession(session.id)} className="delete-btn">
                    Delete
                  </button>
                </div>
                <div className="history-pairs">
                  {session.pairs.map((pair, idx) => (
                    <span key={idx} className="history-pair">
                      {pair.join(' & ')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
