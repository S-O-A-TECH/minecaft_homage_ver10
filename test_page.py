import sys
import io

# Force stdout/stderr to use UTF-8 to prevent CP949 character encoding crashes on Windows terminal layouts
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    print("Launching headless Chromium...")
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    
    # Capture console messages
    console_msgs = []
    page.on("console", lambda msg: console_msgs.append(f"[{msg.type}] {msg.text}"))
    
    # Navigate to Vite dev server on port 5174
    print("Navigating to http://localhost:5174/ ...")
    page.goto("http://localhost:5174/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)  # Wait for Three.js canvas init
    
    # Take initial screenshot of the lock/main menu screen
    page.screenshot(path="screenshot_initial.png")
    print("Initial screenshot saved to screenshot_initial.png")
    
    # Simulate first user interaction to resume AudioContext and enter game mode
    print("Clicking on lock message to start the game and initialize AudioContext...")
    page.click("#lock-message")
    page.wait_for_timeout(1000)
    
    # Simulate movement keys (W and D)...
    print("Simulating movement keys (W and D)...")
    page.keyboard.down("KeyW")
    page.wait_for_timeout(500)
    page.keyboard.up("KeyW")
    page.keyboard.down("KeyD")
    page.wait_for_timeout(500)
    page.keyboard.up("KeyD")
    
    # Take active play screenshot
    page.screenshot(path="screenshot_active.png")
    print("Active play screenshot saved to screenshot_active.png")

    # Select Hotbar Slot 5 (the apple)
    print("Selecting hotbar slot 5 (Apple)...")
    page.keyboard.press("Digit5")
    page.wait_for_timeout(2000)

    # Take screenshot holding the apple
    page.screenshot(path="screenshot_apple.png")
    print("Apple held screenshot saved to screenshot_apple.png")
    
    # Check page title
    print(f"Page title: {page.title()}")
    
    # Check if canvas exists (Three.js renders to canvas)
    canvas = page.locator("canvas")
    canvas_count = canvas.count()
    print(f"Canvas elements found: {canvas_count}")
    
    # Print console messages
    print("\n--- Console Messages ---")
    for msg in console_msgs:
        print(msg)
    
    # Check for any error elements on page
    body_text = page.locator("body").inner_text()
    if body_text.strip():
        print(f"\n--- Body Text (first 500 chars) ---")
        print(body_text[:500])
    else:
        print("\nBody is empty (likely a canvas-only app)")
    
    browser.close()
    print("\nVisual validation completed successfully!")