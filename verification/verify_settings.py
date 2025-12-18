from playwright.sync_api import sync_playwright
import os

os.makedirs('verification', exist_ok=True)

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    try:
        page.goto("http://localhost:3000")

        # Wait for app load
        page.wait_for_selector("[data-testid='toolbar']")

        # Open settings
        page.click("[data-testid='open-settings-button']")

        # Wait for modal
        page.wait_for_selector(".settings-modal")

        # Click Advanced tab
        page.click("[data-testid='tab-advanced']")

        # Wait for content
        page.wait_for_selector("text=Cache Size Limit")

        # Screenshot
        page.screenshot(path="verification/advanced_settings.png")
    except Exception as e:
        print(f"Error: {e}")
        page.screenshot(path="verification/error.png")
    finally:
        browser.close()

with sync_playwright() as playwright:
    run(playwright)
