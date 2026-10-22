import time
import os
import shutil
from playwright.sync_api import sync_playwright

def record_walkthrough():
    output_dir = os.path.abspath("recordings_temp")
    if os.path.exists(output_dir):
        shutil.rmtree(output_dir)
    os.makedirs(output_dir, exist_ok=True)

    final_video_path = os.path.abspath("caresync_demo_video.webm")

    print("[1/6] Launching Playwright Chromium with video recording...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--no-first-run",
                "--no-zygote",
                "--single-process",
                "--disable-gpu"
            ]
        )
        
        context = browser.new_context(
            viewport={"width": 1920, "height": 1080},
            record_video_dir=output_dir,
            record_video_size={"width": 1920, "height": 1080}
        )
        
        page = context.new_page()
        
        print("[2/6] Navigating to live deployment: https://caresync-alpha-ochre.vercel.app/ ...")
        page.goto("https://caresync-alpha-ochre.vercel.app/", wait_until="networkidle")
        time.sleep(3)

        # Hover over top bar and widgets
        page.mouse.move(300, 30)
        time.sleep(1)
        page.mouse.move(960, 300)
        time.sleep(1.5)

        # SCENE 1: Emergency Triage & Paramedic Door Unlock
        print("[3/6] Executing Scene 1: Acute Distress Triage & Door Unlock...")
        emergency_btn = page.locator("button:has-text('acute chest tightness')")
        emergency_btn.hover()
        time.sleep(1)
        emergency_btn.click()
        time.sleep(5)  # Wait for tool execution, card rendering, and audio wave animation

        # Hover over emergency status and unlocked door
        page.mouse.move(1100, 200)
        time.sleep(1.5)
        page.mouse.move(750, 480)
        time.sleep(1.5)

        # SCENE 2: Medication Adherence Check
        print("[4/6] Executing Scene 2: Medication Verification...")
        med_btn = page.locator("button:has-text('evening medication schedule')")
        med_btn.hover()
        time.sleep(1)
        med_btn.click()
        time.sleep(4)

        # Toggle medication checkmark
        circle_btn = page.locator("button:has(svg.lucide-circle)").first
        if circle_btn.count() > 0:
            circle_btn.hover()
            time.sleep(0.5)
            circle_btn.click()
            time.sleep(1.5)

        # SCENE 3: Smart Home Access Control
        print("[5/6] Executing Scene 3: Ring Smart Home Control...")
        lock_btn = page.locator("button:has-text('Secure front entrance')")
        lock_btn.hover()
        time.sleep(1)
        lock_btn.click()
        time.sleep(4)

        # SCENE 4: Developer Protocol Console & Telemetry
        print("[6/6] Executing Scene 4: Developer Protocol Console...")
        protocol_btn = page.locator("button:has-text('Developer Protocol')")
        protocol_btn.hover()
        time.sleep(0.8)
        protocol_btn.click()
        time.sleep(3)  # Drawer slides in, showing JSON-RPC 2.0 logs

        # Switch to Schemas tab
        schemas_tab = page.locator("button:has-text('MCP Tool Schemas')")
        schemas_tab.hover()
        time.sleep(0.8)
        schemas_tab.click()
        time.sleep(3)

        # Switch back to Logs
        logs_tab = page.locator("button:has-text('JSON-RPC Packet Log')")
        logs_tab.click()
        time.sleep(2)

        # Close Drawer
        close_btn = page.locator(".lucide-x").first
        if close_btn.count() > 0:
            close_btn.click()
            time.sleep(2)

        time.sleep(2)
        
        # Close page and context to finalize video writing
        page.close()
        context.close()
        browser.close()

    # Move recorded video to root
    for f in os.listdir(output_dir):
        if f.endswith(".webm"):
            src = os.path.join(output_dir, f)
            shutil.move(src, final_video_path)
            print(f"\n SUCCESS: Demo video recorded and saved to: {final_video_path}")
            print(f" File Size: {os.path.getsize(final_video_path) / (1024*1024):.2f} MB")
            break

if __name__ == "__main__":
    record_walkthrough()
