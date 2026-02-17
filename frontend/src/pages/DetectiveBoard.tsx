/**
 * Detective Board Page
 * Visual investigation board with draggable items and red-line connections
 * Connects evidence, suspects, and leads in a visual map
 */
import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNotification } from '../contexts/NotificationContext';
import {
  getDetectiveBoards,
  getDetectiveBoard,
  createDetectiveBoard,
  createBoardItem,
  updateBoardItem,
  deleteBoardItem,
  createEvidenceConnection,
  deleteEvidenceConnection,
} from '../services/investigation';
import type { DetectiveBoard, BoardItem } from '../types';
import LoadingSkeleton from '../components/LoadingSkeleton';
import './DetectiveBoard.css';

interface DragState {
  itemId: number;
  offsetX: number;
  offsetY: number;
}

const DetectiveBoardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { showNotification } = useNotification();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  const caseId = searchParams.get('case') ? Number(searchParams.get('case')) : null;

  const [boards, setBoards] = useState<DetectiveBoard[]>([]);
  const [activeBoard, setActiveBoard] = useState<DetectiveBoard | null>(null);
  const [loading, setLoading] = useState(true);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [connectMode, setConnectMode] = useState(false);
  const [connectFrom, setConnectFrom] = useState<number | null>(null);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const params = caseId ? { case: caseId } : {};
      const res = await getDetectiveBoards(params);
      setBoards(res.results);
      if (res.results.length > 0) {
        const full = await getDetectiveBoard(res.results[0].id);
        setActiveBoard(full);
      }
    } catch {
      showNotification('Failed to load detective boards', 'error');
    } finally {
      setLoading(false);
    }
  }, [caseId, showNotification]);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  // Draw connections on canvas
  useEffect(() => {
    if (!activeBoard || !canvasRef.current || !boardRef.current) return;
    const canvas = canvasRef.current;
    const board = boardRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = board.clientWidth;
    canvas.height = board.clientHeight;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw red lines between connected items
    (activeBoard.connections || []).forEach((conn) => {
      const fromItem = (activeBoard.items || []).find((i) => i.id === conn.from_item);
      const toItem = (activeBoard.items || []).find((i) => i.id === conn.to_item);
      if (!fromItem || !toItem) return;

      ctx.beginPath();
      ctx.moveTo(fromItem.position_x + 60, fromItem.position_y + 30);
      ctx.lineTo(toItem.position_x + 60, toItem.position_y + 30);
      ctx.strokeStyle = '#8b1a1a';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 4]);
      ctx.stroke();

      // Draw small circles at endpoints
      [fromItem, toItem].forEach((item) => {
        ctx.beginPath();
        ctx.arc(item.position_x + 60, item.position_y + 30, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#8b1a1a';
        ctx.fill();
      });
    });
  }, [activeBoard]);

  const handleCreateBoard = async () => {
    if (!caseId) {
      showNotification('Please specify a case ID in the URL (?case=ID)', 'error');
      return;
    }
    try {
      const newBoard = await createDetectiveBoard({ case: caseId });
      const full = await getDetectiveBoard(newBoard.id);
      setActiveBoard(full);
      setBoards((prev) => [...prev, newBoard]);
      showNotification('Detective board created', 'success');
    } catch {
      showNotification('Failed to create board', 'error');
    }
  };

  const handleAddItem = async () => {
    if (!activeBoard || !newItemLabel.trim()) return;
    try {
      const item = await createBoardItem({
        board: activeBoard.id,
        content_type: 'note',
        object_id: 0,
        label: newItemLabel,
        notes: newItemNotes || undefined,
        position_x: 100 + Math.random() * 300,
        position_y: 100 + Math.random() * 200,
      });
      setActiveBoard((prev) =>
        prev ? { ...prev, items: [...(prev.items || []), item] } : prev
      );
      setNewItemLabel('');
      setNewItemNotes('');
      setShowAddItem(false);
    } catch {
      showNotification('Failed to add item', 'error');
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    try {
      await deleteBoardItem(itemId);
      setActiveBoard((prev) =>
        prev
          ? {
              ...prev,
              items: (prev.items || []).filter((i) => i.id !== itemId),
              connections: (prev.connections || []).filter(
                (c) => c.from_item !== itemId && c.to_item !== itemId
              ),
            }
          : prev
      );
    } catch {
      showNotification('Failed to delete item', 'error');
    }
  };

  const handleItemClick = async (itemId: number) => {
    if (!connectMode) return;
    if (connectFrom === null) {
      setConnectFrom(itemId);
    } else if (connectFrom !== itemId && activeBoard) {
      try {
        const conn = await createEvidenceConnection({
          board: activeBoard.id,
          from_item: connectFrom,
          to_item: itemId,
        });
        setActiveBoard((prev) =>
          prev ? { ...prev, connections: [...(prev.connections || []), conn] } : prev
        );
        showNotification('Connection created', 'success');
      } catch {
        showNotification('Failed to create connection', 'error');
      }
      setConnectFrom(null);
      setConnectMode(false);
    }
  };

  const handleDeleteConnection = async (connId: number) => {
    try {
      await deleteEvidenceConnection(connId);
      setActiveBoard((prev) =>
        prev
          ? { ...prev, connections: (prev.connections || []).filter((c) => c.id !== connId) }
          : prev
      );
    } catch {
      showNotification('Failed to delete connection', 'error');
    }
  };

  // Drag handling
  const handleMouseDown = (e: React.MouseEvent, item: BoardItem) => {
    if (connectMode) {
      handleItemClick(item.id);
      return;
    }
    const rect = boardRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDragState({
      itemId: item.id,
      offsetX: e.clientX - rect.left - item.position_x,
      offsetY: e.clientY - rect.top - item.position_y,
    });
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragState || !boardRef.current) return;
      const rect = boardRef.current.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left - dragState.offsetX);
      const y = Math.max(0, e.clientY - rect.top - dragState.offsetY);

      setActiveBoard((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          items: (prev.items || []).map((i) =>
            i.id === dragState.itemId ? { ...i, position_x: x, position_y: y } : i
          ),
        };
      });
    },
    [dragState]
  );

  const handleMouseUp = useCallback(async () => {
    if (!dragState || !activeBoard) {
      setDragState(null);
      return;
    }
    const item = (activeBoard.items || []).find((i) => i.id === dragState.itemId);
    if (item) {
      try {
        await updateBoardItem(item.id, {
          position_x: item.position_x,
          position_y: item.position_y,
        });
      } catch {
        // Silently fail – position is already updated locally
      }
    }
    setDragState(null);
  }, [dragState, activeBoard]);

  // Export board as image
  const handleExport = () => {
    if (!boardRef.current) return;
    showNotification('Use browser screenshot or print to export the board', 'info');
  };

  if (loading) {
    return (
      <div className="detective-board-page">
        <div className="page-header">
          <h1>Detective Board</h1>
        </div>
        <LoadingSkeleton variant="card" />
      </div>
    );
  }

  return (
    <div className="detective-board-page">
      <div className="page-header">
        <div className="page-title-section">
          <h1 className="page-title">Detective Board</h1>
          <p className="page-subtitle">
            Visual investigation map
            {caseId && <span className="filter-indicator"> — Case #{caseId}</span>}
          </p>
        </div>
        <div className="page-actions">
          {activeBoard && (
            <>
              <button
                className={`btn ${connectMode ? 'btn-danger' : ''}`}
                onClick={() => { setConnectMode(!connectMode); setConnectFrom(null); }}
              >
                {connectMode ? '✕ Cancel Connect' : '🔗 Connect Items'}
              </button>
              <button className="btn" onClick={() => setShowAddItem(true)}>
                + Add Item
              </button>
              <button className="btn" onClick={handleExport}>
                📸 Export
              </button>
            </>
          )}
          {!activeBoard && (
            <button className="btn btn-primary" onClick={handleCreateBoard}>
              + Create Board
            </button>
          )}
        </div>
      </div>

      {/* Board Selector */}
      {boards.length > 1 && (
        <div className="board-selector">
          {boards.map((b) => (
            <button
              key={b.id}
              className={`btn btn-sm ${activeBoard?.id === b.id ? 'active' : ''}`}
              onClick={async () => {
                const full = await getDetectiveBoard(b.id);
                setActiveBoard(full);
              }}
            >
              Board #{b.id}
            </button>
          ))}
        </div>
      )}

      {connectMode && (
        <div className="connect-hint">
          {connectFrom
            ? '🔴 Now click the second item to create a connection'
            : '🔴 Click the first item to start a connection'}
        </div>
      )}

      {/* Add Item Form */}
      {showAddItem && (
        <div className="card add-item-form">
          <div className="form-group">
            <label>Label</label>
            <input
              type="text"
              value={newItemLabel}
              onChange={(e) => setNewItemLabel(e.target.value)}
              placeholder="Item label (e.g., Suspect A, Knife, Alibi)"
            />
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea
              value={newItemNotes}
              onChange={(e) => setNewItemNotes(e.target.value)}
              placeholder="Additional notes..."
              rows={2}
            />
          </div>
          <div className="form-actions-inline">
            <button className="btn btn-primary" onClick={handleAddItem}>
              Add
            </button>
            <button className="btn" onClick={() => setShowAddItem(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* The Board */}
      {activeBoard ? (
        <div
          ref={boardRef}
          className="board-canvas-container"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <canvas ref={canvasRef} className="board-canvas" />

          {(activeBoard.items || []).map((item) => (
            <div
              key={item.id}
              className={`board-item ${connectMode ? 'connectable' : ''} ${
                connectFrom === item.id ? 'selected' : ''
              } ${dragState?.itemId === item.id ? 'dragging' : ''}`}
              style={{ left: item.position_x, top: item.position_y }}
              onMouseDown={(e) => handleMouseDown(e, item)}
            >
              <div className="board-item-label">{item.label || `Item #${item.id}`}</div>
              {item.notes && <div className="board-item-notes">{item.notes}</div>}
              {!connectMode && (
                <button
                  className="board-item-delete"
                  onClick={(e) => { e.stopPropagation(); handleDeleteItem(item.id); }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state-large">
          <p>No detective board for this case yet. Create one to start connecting the dots.</p>
        </div>
      )}

      {/* Connections List */}
      {activeBoard && (activeBoard.connections || []).length > 0 && (
        <div className="connections-list card">
          <h3>Connections</h3>
          <ul>
            {(activeBoard.connections || []).map((conn) => {
              const from = (activeBoard.items || []).find((i) => i.id === conn.from_item);
              const to = (activeBoard.items || []).find((i) => i.id === conn.to_item);
              return (
                <li key={conn.id} className="connection-item">
                  <span>{from?.label || `#${conn.from_item}`}</span>
                  <span className="connection-arrow">→</span>
                  <span>{to?.label || `#${conn.to_item}`}</span>
                  {conn.notes && <span className="connection-notes">({conn.notes})</span>}
                  <button
                    className="btn-icon"
                    onClick={() => handleDeleteConnection(conn.id)}
                    title="Remove connection"
                  >
                    ✕
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DetectiveBoardPage;
