import React, { useState, useCallback, useRef, useEffect } from 'react';
import { createRoot } from 'react-dom/client';

const CELL_STATE = {
    EMPTY: 0,
    QUEEN: 1,
    TRYING: 2,
};

const App = () => {
    const [boardSize, setBoardSize] = useState(4);
    const [board, setBoard] = useState(Array(4).fill(0).map(() => Array(4).fill(CELL_STATE.EMPTY)));
    const [isSolving, setIsSolving] = useState(false);
    const [status, setStatus] = useState('Presiona "Resolver" para empezar.');
    
    // Ref para el estado de resolución, útil para closures en callbacks.
    const isSolvingRef = useRef(isSolving);
    useEffect(() => {
        isSolvingRef.current = isSolving;
    }, [isSolving]);

    // Ref dedicada para manejar la cancelación de forma explícita.
    const isCancelledRef = useRef(false);

    const speed = 150; // ms

    const createBoard = (size) => {
        return Array(size).fill(0).map(() => Array(size).fill(CELL_STATE.EMPTY));
    };

    const handleSizeChange = (e) => {
        const newSize = parseInt(e.target.value, 10);
        if (newSize > 0 && newSize <= 10) {
            setBoardSize(newSize);
            setBoard(createBoard(newSize));
            setStatus('Tamaño del tablero cambiado. Listo para resolver.');
        }
    };
    
    const reset = useCallback(() => {
        // Si se está resolviendo, marcamos explícitamente como cancelado.
        if (isSolvingRef.current) {
            isCancelledRef.current = true;
        }
        setIsSolving(false); 
        setBoard(createBoard(boardSize));
        setStatus('Presiona "Resolver" para empezar.');
    }, [boardSize]);


    const delay = (ms) => new Promise(res => setTimeout(res, ms));

    const isSafe = (currentBoard, row, col) => {
        let i, j;
        // Comprueba la fila en el lado izquierdo
        for (i = 0; i < col; i++) {
            if (currentBoard[row][i] === CELL_STATE.QUEEN) return false;
        }
        // Comprueba la diagonal superior en el lado izquierdo
        for (i = row, j = col; i >= 0 && j >= 0; i--, j--) {
            if (currentBoard[i][j] === CELL_STATE.QUEEN) return false;
        }
        // Comprueba la diagonal inferior en el lado izquierdo
        for (i = row, j = col; j >= 0 && i < boardSize; i++, j--) {
            if (currentBoard[i][j] === CELL_STATE.QUEEN) return false;
        }
        return true;
    };

    const solve = async () => {
        if (isSolving) return;

        isCancelledRef.current = false; // Reinicia la bandera de cancelación
        setIsSolving(true);
        setBoard(createBoard(boardSize));
        setStatus('Resolviendo...');

        // Espera un momento para asegurar que el estado se actualice
        await delay(10); 
        
        const newBoard = createBoard(boardSize);
        
        const backtrack = async (col) => {
            // La cancelación ahora se comprueba con su propia bandera dedicada
            if (isCancelledRef.current) return false;

            if (col >= boardSize) {
                return true; // Solución encontrada
            }

            for (let i = 0; i < boardSize; i++) {
                 if (isCancelledRef.current) return false;

                // Visualiza el intento
                newBoard[i][col] = CELL_STATE.TRYING;
                setBoard([...newBoard.map(r => [...r])]);
                await delay(speed);
                if (isCancelledRef.current) return false; // Comprueba de nuevo tras el delay

                if (isSafe(newBoard, i, col)) {
                    newBoard[i][col] = CELL_STATE.QUEEN;
                    setBoard([...newBoard.map(r => [...r])]);
                    await delay(speed);

                    if (await backtrack(col + 1)) {
                        return true;
                    }
                    
                    if (isCancelledRef.current) return false;

                    // Backtrack
                    newBoard[i][col] = CELL_STATE.EMPTY;
                    setBoard([...newBoard.map(r => [...r])]);
                    await delay(speed);
                } else {
                    // No es seguro, elimina el estado de intento
                    newBoard[i][col] = CELL_STATE.EMPTY;
                    setBoard([...newBoard.map(r => [...r])]);
                    await delay(speed/2);
                }
            }
            return false; // No hay solución desde esta columna
        };
        
        const foundSolution = await backtrack(0);
        
        // El estado final se decide en función de la bandera de cancelación, no del estado 'isSolving'
        if (isCancelledRef.current) {
            setStatus('Resolución cancelada.');
        } else if (foundSolution) {
            setStatus('¡Solución encontrada!');
        } else {
            setStatus('No se encontró solución.');
            setBoard(createBoard(boardSize)); // Limpia el tablero si no hay solución
        }

        setIsSolving(false);
    };


    return (
        <div className="container">
            <h1>Visualizador de Backtracking: N-Reinas</h1>
            <div className="controls">
                <div className="control-group">
                    <label htmlFor="board-size">Reinas (N):</label>
                    <input
                        type="number"
                        id="board-size"
                        value={boardSize}
                        onChange={handleSizeChange}
                        min="1"
                        max="10"
                        disabled={isSolving}
                    />
                </div>
                <button className="solve-btn" onClick={solve} disabled={isSolving}>
                    Resolver
                </button>
                <button className="reset-btn" onClick={reset}>
                    {isSolving ? 'Cancelar' : 'Reiniciar'}
                </button>
            </div>
            <div className="board-container">
                 <div className="board" style={{ gridTemplateColumns: `repeat(${boardSize}, 50px)` }}>
                    {board.map((row, rowIndex) =>
                        row.map((cell, colIndex) => (
                            <div
                                key={`${rowIndex}-${colIndex}`}
                                className={`cell ${ (rowIndex + colIndex) % 2 === 0 ? 'light' : 'dark' } ${ cell === CELL_STATE.TRYING ? 'trying' : '' }`}
                            >
                                {cell === CELL_STATE.QUEEN ? '♛' : ''}
                            </div>
                        ))
                    )}
                </div>
            </div>
            <p className="status">{status}</p>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
