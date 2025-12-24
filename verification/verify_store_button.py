from playwright.sync_api import sync_playwright

def verify_frontend():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        try:
            page.goto('http://localhost:3000?skipAuth=true')

            # Wait for toolbar to appear (it should appear after loading banner disappears)
            # We wait for the "Store" button specifically
            page.wait_for_selector('[data-testid="store-files-button"]', timeout=20000)

            # Take screenshot of the whole page
            page.screenshot(path='verification/toolbar_verification.png')
            print("Screenshot taken successfully.")

        except Exception as e:
            print(f"Error: {e}")
            page.screenshot(path='verification/error.png')

        finally:
            browser.close()

if __name__ == "__main__":
    verify_frontend()
