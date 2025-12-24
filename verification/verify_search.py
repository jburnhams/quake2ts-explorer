from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Add skipAuth=true to avoid login redirect
        page.goto("http://localhost:3000?skipAuth=true")

        # Wait for file tree to load
        expect(page.get_by_test_id("file-tree")).to_be_visible(timeout=10000)
        print("File tree visible")

        # Check search input
        search_input = page.get_by_test_id("file-search-input")
        expect(search_input).to_be_visible()

        # Type search
        search_input.fill("tri")

        # Wait for dropdown
        dropdown = page.get_by_test_id("file-search-dropdown")
        expect(dropdown).to_be_visible(timeout=5000)

        # Take screenshot of dropdown
        page.screenshot(path="verification/verification.png")
        print("Screenshot taken")

        # Click an item if available
        items = page.locator(".file-search-item")
        if items.count() > 0:
            items.first.click()
            time.sleep(1)
            page.screenshot(path="verification/verification_selected.png")
            print("Screenshot selected taken")

        browser.close()

if __name__ == "__main__":
    run()
