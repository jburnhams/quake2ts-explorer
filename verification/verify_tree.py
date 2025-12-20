
from playwright.sync_api import sync_playwright, expect

def verify_file_tree():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        try:
            print("Navigating to app...")
            page.goto("http://localhost:3000")

            # Wait for loading to finish (banner disappears)
            print("Waiting for loading to finish...")
            expect(page.get_by_test_id("loading-banner")).to_be_hidden(timeout=10000)

            # Check for file tree content
            print("Checking file tree...")
            file_tree = page.get_by_test_id("file-tree")
            expect(file_tree).to_be_visible()

            # Expecting 'default.cfg' or 'pak0.pak' contents if default pak loaded
            # We look for ANY tree item
            tree_items = page.locator(".tree-node")
            count = tree_items.count()
            print(f"Found {count} tree items")

            if count == 0:
                print("Error: File tree is empty!")
                # Take screenshot of empty tree
                page.screenshot(path="verification/empty_tree.png")
            else:
                # Take screenshot of populated tree
                print("Success: File tree populated.")
                page.screenshot(path="verification/populated_tree.png")

                # Print first few items text
                for i in range(min(5, count)):
                    print(f"Item {i}: {tree_items.nth(i).text_content()}")

        except Exception as e:
            print(f"Verification failed: {e}")
            page.screenshot(path="verification/error.png")
        finally:
            browser.close()

if __name__ == "__main__":
    verify_file_tree()
