// Reproduction/Verification script for Swipe Left Logic

// Mock DOM elements and Events
const createMockElement = (classList = []) => ({
  classList: {
    contains: (cls) => classList.includes(cls),
    add: (cls) => classList.push(cls),
    remove: (cls) => {
      const idx = classList.indexOf(cls);
      if (idx > -1) classList.splice(idx, 1);
    }
  },
  style: { transform: '', opacity: '' },
  dataset: {},
  querySelector: () => ({ style: {} }), // simple mock
  querySelectorAll: () => [],
});

const mockContainer = createMockElement(['swipe-container']);
const mockRow = createMockElement(['experiment-row']);
mockContainer.querySelector = () => mockRow; // container.querySelector('.experiment-row') -> row

const swipeState = {
    active: false,
    startX: 0,
    startY: 0,
    currentX: 0,
    direction: 'horizontal',
    container: mockContainer,
    row: mockRow,
    didSwipe: false,
    startTime: 0,
    hapticTriggered: false
};

// Parameters from app.js
const COMMIT_THRESHOLD = 60;
const BUTTONS_WIDTH = 152;
const VELOCITY_THRESHOLD = 0.25;

function simulateTouchEnd(currentX, startTime) {
    const elapsed = Date.now() - startTime;
    const velocity = Math.abs(currentX) / elapsed;
    const isRevealed = mockRow.dataset.revealed === 'open' || mockRow.dataset.revealed === 'right' || mockRow.dataset.revealed === 'left';

    console.log(`Simulating TouchEnd: currentX=${currentX}, velocity=${velocity.toFixed(2)}, isRevealed=${isRevealed} (${mockRow.dataset.revealed})`);

    // --- LOGIC TO BE IMPLEMENTED ---
    if (isRevealed) {
        // Already open - check if we should close
        const isRightOpen = mockRow.dataset.revealed === 'right' || mockRow.dataset.revealed === 'open'; // Support legacy 'open'
        const isLeftOpen = mockRow.dataset.revealed === 'left';

        let shouldClose = false;

        if (isRightOpen) {
            // Open to right (positive), need negative delta to close
             shouldClose = currentX < -COMMIT_THRESHOLD || (currentX < 0 && velocity > VELOCITY_THRESHOLD);
        } else if (isLeftOpen) {
            // Open to left (negative), need positive delta to close
            shouldClose = currentX > COMMIT_THRESHOLD || (currentX > 0 && velocity > VELOCITY_THRESHOLD);
        }

        if (shouldClose) {
            console.log("Action: Close");
            mockRow.classList.remove('swiping');
            mockRow.style.transform = '';
            delete mockRow.dataset.revealed;
        } else {
            console.log("Action: Stay Open");
            mockRow.classList.remove('swiping');
            if (isRightOpen) {
                mockRow.style.transform = `translateX(${BUTTONS_WIDTH}px)`;
            } else {
                mockRow.style.transform = `translateX(-${BUTTONS_WIDTH}px)`;
            }
        }
    } else {
        // Not open - check if swipe to open
        if (currentX > COMMIT_THRESHOLD || (currentX > 0 && velocity > VELOCITY_THRESHOLD)) {
            // Swipe Right -> Open Left Actions
            console.log("Action: Open Right (reveal Left Actions)");
            mockRow.classList.remove('swiping');
            mockRow.style.transform = `translateX(${BUTTONS_WIDTH}px)`;
            mockRow.dataset.revealed = 'right';
        } else if (currentX < -COMMIT_THRESHOLD || (currentX < 0 && velocity > VELOCITY_THRESHOLD)) {
            // Swipe Left -> Open Right Actions
            console.log("Action: Open Left (reveal Right Actions)");
            mockRow.classList.remove('swiping');
            mockRow.style.transform = `translateX(-${BUTTONS_WIDTH}px)`;
            mockRow.dataset.revealed = 'left';
        } else {
            console.log("Action: Stay Closed");
            mockRow.classList.remove('swiping');
            mockRow.style.transform = '';
        }
    }
}

// Test Case 1: Swipe Right (Positive X) -> Should Open Right
console.log("--- Test Case 1: Swipe Right ---");
mockRow.dataset = {};
mockRow.style.transform = '';
simulateTouchEnd(100, Date.now() - 200);

// Test Case 2: Swipe Left (Negative X) -> Should Open Left
console.log("\n--- Test Case 2: Swipe Left ---");
mockRow.dataset = {};
mockRow.style.transform = '';
simulateTouchEnd(-100, Date.now() - 200);

// Test Case 3: Close Right (from Open Right)
console.log("\n--- Test Case 3: Close Right (Swipe Left) ---");
mockRow.dataset = { revealed: 'right' };
mockRow.style.transform = `translateX(${BUTTONS_WIDTH}px)`;
simulateTouchEnd(-100, Date.now() - 200);

// Test Case 4: Close Left (from Open Left)
console.log("\n--- Test Case 4: Close Left (Swipe Right) ---");
mockRow.dataset = { revealed: 'left' };
mockRow.style.transform = `translateX(-${BUTTONS_WIDTH}px)`;
simulateTouchEnd(100, Date.now() - 200);
