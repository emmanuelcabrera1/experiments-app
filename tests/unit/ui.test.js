/**
 * Unit Tests for UI Utilities
 * Tests escapeHtml() and formatTextWithLinks()
 * 
 * Usage:
 * 1. Open experiments-web in browser
 * 2. Open DevTools Console
 * 3. Paste this file or load via script
 * 4. Tests run automatically, results in console
 */

const UITests = {
    passed: 0,
    failed: 0,

    /**
     * Simple assertion helper
     */
    assert(condition, message) {
        if (condition) {
            this.passed++;
            console.log(`✅ PASS: ${message}`);
        } else {
            this.failed++;
            console.error(`❌ FAIL: ${message}`);
        }
    },

    /**
     * Assert equality helper
     */
    assertEqual(actual, expected, message) {
        const pass = actual === expected;
        if (pass) {
            this.passed++;
            console.log(`✅ PASS: ${message}`);
        } else {
            this.failed++;
            console.error(`❌ FAIL: ${message}`);
            console.error(`   Expected: ${expected}`);
            console.error(`   Actual: ${actual}`);
        }
    },

    /**
     * Test: escapeHtml prevents XSS
     */
    testEscapeHtml() {
        console.log('\n📋 TEST: escapeHtml()');

        // Basic text passes through
        this.assertEqual(
            escapeHtml('Hello World'),
            'Hello World',
            'Plain text is unchanged'
        );

        // Empty/null handling
        this.assertEqual(escapeHtml(''), '', 'Empty string returns empty');
        this.assertEqual(escapeHtml(null), '', 'Null returns empty');
        this.assertEqual(escapeHtml(undefined), '', 'Undefined returns empty');

        // HTML entities are escaped
        this.assertEqual(
            escapeHtml('<script>alert("xss")</script>'),
            '&lt;script&gt;alert("xss")&lt;/script&gt;',
            'Script tags are escaped'
        );

        this.assertEqual(
            escapeHtml('<img src="x" onerror="alert(1)">'),
            '&lt;img src="x" onerror="alert(1)"&gt;',
            'Image tag with onerror is escaped'
        );

        this.assertEqual(
            escapeHtml('a < b && c > d'),
            'a &lt; b &amp;&amp; c &gt; d',
            'Comparison operators are escaped'
        );

        this.assertEqual(
            escapeHtml('"double" and \'single\''),
            '"double" and \'single\'',
            'Quotes are preserved (innerHTML behavior)'
        );
    },

    /**
     * Test: formatTextWithLinks detects and links URLs
     */
    testFormatTextWithLinks() {
        console.log('\n📋 TEST: formatTextWithLinks()');

        // Empty/null handling
        this.assertEqual(formatTextWithLinks(''), '', 'Empty string returns empty');
        this.assertEqual(formatTextWithLinks(null), '', 'Null returns empty');

        // Plain text without URLs
        this.assertEqual(
            formatTextWithLinks('Hello World'),
            'Hello World',
            'Text without URLs is unchanged'
        );

        // Single URL
        const singleUrl = formatTextWithLinks('Check out https://google.com');
        this.assert(
            singleUrl.includes('<a href="https://google.com"'),
            'Single URL is wrapped in anchor tag'
        );
        this.assert(
            singleUrl.includes('target="_blank"'),
            'Link opens in new tab'
        );
        this.assert(
            singleUrl.includes('rel="noopener noreferrer"'),
            'Link has security attributes'
        );
        this.assert(
            singleUrl.includes('class="note-link"'),
            'Link has note-link class'
        );

        // Multiple URLs
        const multiUrl = formatTextWithLinks('Visit https://a.com and https://b.com');
        const matchCount = (multiUrl.match(/<a href/g) || []).length;
        this.assertEqual(matchCount, 2, 'Multiple URLs are all linked');

        // URL at start of text
        const startUrl = formatTextWithLinks('https://start.com is the link');
        this.assert(
            startUrl.startsWith('<a href'),
            'URL at start is linked'
        );

        // URL at end of text
        const endUrl = formatTextWithLinks('The link is https://end.com');
        this.assert(
            endUrl.includes('</a>'),
            'URL at end is linked'
        );

        // HTTP vs HTTPS
        const httpUrl = formatTextWithLinks('Old site: http://old.com');
        this.assert(
            httpUrl.includes('<a href="http://old.com"'),
            'HTTP URLs are also linked'
        );

        // URL with path and query
        const complexUrl = formatTextWithLinks('Link: https://site.com/path?query=1&foo=bar');
        this.assert(
            complexUrl.includes('https://site.com/path?query=1'),
            'Complex URLs with path/query are linked'
        );

        // XSS prevention in URLs
        const xssUrl = formatTextWithLinks('Bad: https://evil.com/"><script>alert(1)</script>');
        this.assert(
            !xssUrl.includes('<script>'),
            'Script tags in URLs are escaped'
        );

        // Mixed content XSS prevention
        const mixedXss = formatTextWithLinks('<script>bad</script> https://good.com');
        this.assert(
            mixedXss.includes('&lt;script&gt;'),
            'Script tags in text are escaped'
        );
        this.assert(
            mixedXss.includes('<a href="https://good.com"'),
            'URL still works after escaping'
        );
    },

    /**
     * Test: Edge cases
     */
    testEdgeCases() {
        console.log('\n📋 TEST: Edge Cases');

        // Very long URL
        const longUrl = 'https://example.com/' + 'a'.repeat(1000);
        const longResult = formatTextWithLinks(`Link: ${longUrl}`);
        this.assert(
            longResult.includes('<a href'),
            'Very long URLs are still linked'
        );

        // URL-like but not valid
        const notUrl = formatTextWithLinks('Not a link: htp://invalid.com');
        this.assert(
            !notUrl.includes('<a href'),
            'Invalid protocol is not linked'
        );

        // URL in parentheses
        const parenUrl = formatTextWithLinks('See (https://example.com) for more');
        this.assert(
            parenUrl.includes('<a href="https://example.com'),
            'URL in parentheses is linked'
        );

        // Newlines preserved
        const newlines = formatTextWithLinks('Line 1\nLine 2\nhttps://link.com');
        this.assert(
            newlines.includes('\n'),
            'Newlines are preserved'
        );
    },

    /**
     * Run all tests
     */
    runAll() {
        console.clear();
        console.log('═══════════════════════════════════════════');
        console.log('   🧪 UI Utilities Unit Tests');
        console.log('═══════════════════════════════════════════');

        this.passed = 0;
        this.failed = 0;

        try {
            this.testEscapeHtml();
            this.testFormatTextWithLinks();
            this.testEdgeCases();
        } catch (error) {
            console.error('❌ Test error:', error);
        }

        console.log('\n═══════════════════════════════════════════');
        console.log(`   📊 RESULTS: ${this.passed} passed, ${this.failed} failed`);
        console.log('═══════════════════════════════════════════');

        return { passed: this.passed, failed: this.failed };
    }
};

// Auto-run if functions are available
if (typeof escapeHtml !== 'undefined' && typeof formatTextWithLinks !== 'undefined') {
    UITests.runAll();
} else {
    console.error('❌ UI functions not found. Make sure to run this in the experiments-web context.');
}
