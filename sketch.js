// ========================================
// p5.js - Flat graphic shapes overlay
// Mode 1 (default drag): colored circles, triangles, rectangles
// Mode 2 (hold "b" + drag): black line segments along cursor path
// Mode 3 (hold "e" + drag): eraser — removes nearby shapes and lines
// Shapes over text fade out; shapes over empty space persist
// Lines over text fade out; lines over empty space persist
// Canvas is fixed, full-window, transparent
// ========================================

let shapes = []; // colored shapes and line segments
let bKeyDown = false; // tracks whether "b" is held
let eKeyDown = false; // tracks whether "e" is held (eraser mode)

// Eraser settings
const ERASER_RADIUS = 40; // pixels — how wide the eraser brush is

// Palette
const COLORS = {
  red:    '#E94B35',
  blue:   '#6FA7D6',
  yellow: '#F2C94C',
  green:  '#6FBF73',
  black:  '#1A1A1A'
};

// Tags that count as "text" -- shapes over these fade out
const TEXT_TAGS = ['P', 'LI', 'SPAN', 'A', 'BLOCKQUOTE', 'CODE', 'PRE'];

function setup() {
  let cnv = createCanvas(windowWidth, windowHeight);
  cnv.position(0, 0);
  cnv.style("position", "fixed");
  cnv.style("top", "0");
  cnv.style("left", "0");
  cnv.style("z-index", "9999");
  cnv.style("pointer-events", "none");

  angleMode(RADIANS);
}

// --- Track "b" key state ---
function keyPressed() {
  if (key === 'b' || key === 'B') bKeyDown = true;
  if (key === 'e' || key === 'E') eKeyDown = true;
}

function keyReleased() {
  if (key === 'b' || key === 'B') bKeyDown = false;
  if (key === 'e' || key === 'E') eKeyDown = false;
}

function draw() {
  clear();

  for (let i = shapes.length - 1; i >= 0; i--) {
    let s = shapes[i];

    // Check text overlap once per shape
    if (!s.checked) {
      s.overText = isOverText(s.x, s.y);
      s.checked = true;
    }

    // Fade if over text
    if (s.overText) {
      s.alpha -= s.decay;
    }

    // Remove fully faded
    if (s.alpha <= 0) {
      shapes.splice(i, 1);
      continue;
    }

    // Draw based on mode
    if (s.mode === 'line') {
      drawLineSegment(s);
    } else {
      drawColoredShape(s);
    }
  }

  // --- Eraser cursor preview: faint circle while "e" is held ---
  if (eKeyDown) {
    push();
    noFill();
    stroke(150, 150, 150, 100);
    strokeWeight(1.5);
    ellipse(mouseX, mouseY, ERASER_RADIUS * 2, ERASER_RADIUS * 2);
    pop();
  }
}

// --- Check if a screen position sits over a text element ---
function isOverText(x, y) {
  let el = document.elementFromPoint(x, y);
  if (!el) return false;
  if (TEXT_TAGS.indexOf(el.tagName) !== -1) return true;
  if (el.parentElement && TEXT_TAGS.indexOf(el.parentElement.tagName) !== -1) return true;
  return false;
}

// ========================================
// MODE 1: Colored flat shapes
// ========================================

function drawColoredShape(s) {
  let c = color(s.color);
  c.setAlpha(s.alpha);

  push();
  translate(s.x, s.y);
  rotate(s.rotation);
  noStroke();
  fill(c);

  if (s.type === 'circle') {
    ellipse(0, 0, s.size, s.size);
  } else if (s.type === 'triangle') {
    let h = s.size * 0.866;
    triangle(
      -s.size / 2, h / 3,
       s.size / 2, h / 3,
       0, -h * 2 / 3
    );
  } else if (s.type === 'rect') {
    rectMode(CENTER);
    rect(0, 0, s.size * 1.4, s.size * 0.6);
  }

  pop();
}

function pickColoredShape() {
  let r = random(1);
  if (r < 0.40) {
    return { type: 'circle', color: COLORS.blue };
  } else if (r < 0.65) {
    return { type: 'triangle', color: COLORS.red };
  } else if (r < 0.75) {
    return { type: 'circle', color: COLORS.yellow };
  } else if (r < 0.82) {
    return { type: 'rect', color: COLORS.green };
  } else if (r < 0.89) {
    return { type: 'triangle', color: COLORS.black };
  } else if (r < 0.94) {
    return { type: 'rect', color: COLORS.red };
  } else {
    return { type: 'circle', color: COLORS.green };
  }
}

// ========================================
// MODE 2: Black line segments
// ========================================

function drawLineSegment(s) {
  let c = color(COLORS.black);
  c.setAlpha(s.alpha);

  push();
  noFill();
  stroke(c);
  strokeWeight(s.strokeW);
  line(s.x1, s.y1, s.x2, s.y2);
  pop();
}

// ========================================
// MODE 3: Eraser — remove elements near cursor
// ========================================

// Check if a point is within the eraser radius of the cursor
function isNearCursor(px, py, cx, cy) {
  return dist(px, py, cx, cy) <= ERASER_RADIUS;
}

// Check if a line segment is near the cursor.
// Tests both endpoints and a few points along the segment.
function isLineNearCursor(s, cx, cy) {
  // Check endpoints
  if (isNearCursor(s.x1, s.y1, cx, cy)) return true;
  if (isNearCursor(s.x2, s.y2, cx, cy)) return true;
  // Check midpoint of the segment
  let mx = (s.x1 + s.x2) / 2;
  let my = (s.y1 + s.y2) / 2;
  if (isNearCursor(mx, my, cx, cy)) return true;
  return false;
}

// Erase shapes and lines near the current mouse position
function eraseNearCursor() {
  for (let i = shapes.length - 1; i >= 0; i--) {
    let s = shapes[i];
    let shouldRemove = false;

    if (s.mode === 'line') {
      // For lines, check endpoints and midpoint
      shouldRemove = isLineNearCursor(s, mouseX, mouseY);
    } else {
      // For colored shapes, check center position
      shouldRemove = isNearCursor(s.x, s.y, mouseX, mouseY);
    }

    if (shouldRemove) {
      shapes.splice(i, 1);
    }
  }
}

// ========================================
// Spawning on mouse drag
// ========================================

function mouseDragged() {
  // Eraser mode takes priority over all other modes
  if (eKeyDown) {
    eraseNearCursor();
    return;
  }

  if (bKeyDown) {
    // Line segment mode: connect previous position to current
    // Skip if no real movement
    if (pmouseX === mouseX && pmouseY === mouseY) return;

    // Use midpoint for text-overlap check
    let mx = (pmouseX + mouseX) / 2;
    let my = (pmouseY + mouseY) / 2;

    shapes.push({
      mode: 'line',
      x: mx,               // midpoint used for text overlap check
      y: my,
      x1: pmouseX,
      y1: pmouseY,
      x2: mouseX,
      y2: mouseY,
      strokeW: random(2, 5), // slightly varied weight for organic feel
      alpha: 255,
      decay: random(1.5, 3.5),
      checked: false,
      overText: false
    });

  } else {
    // Colored shape mode
    let count = floor(random(1, 3));

    for (let i = 0; i < count; i++) {
      let pick = pickColoredShape();
      shapes.push({
        mode: 'colored',
        x: mouseX + random(-12, 12),
        y: mouseY + random(-12, 12),
        size: random(8, 28),
        rotation: random(TWO_PI),
        type: pick.type,
        color: pick.color,
        alpha: 255,
        decay: random(1.5, 3.5),
        checked: false,
        overText: false
      });
    }
  }

  // Cap total for performance
  if (shapes.length > 800) {
    shapes.splice(0, 80);
  }
}

// --- Resize canvas when window changes ---
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
