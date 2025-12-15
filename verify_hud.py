from playwright.sync_api import sync_playwright, expect

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto("http://localhost:3000")

        # Wait for loading to finish
        print("Waiting for loading...")
        page.wait_for_selector('[data-testid="loading-banner"]', state="detached", timeout=30000)

        # Click maps
        print("Clicking maps...")
        page.locator("div").filter(has_text="maps").last.click()

        # Click demo1.bsp
        print("Clicking demo1.bsp...")
        page.locator("div").filter(has_text="demo1.bsp").last.click()

        # Wait for HUD
        print("Waiting for HUD...")
        expect(page.locator(".hud-stat-label").filter(has_text="Health")).to_be_visible(timeout=10000)
        expect(page.get_by_text("88")).to_be_visible()

        # Take screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification_hud.png")
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification_error.png")
        raise e
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
