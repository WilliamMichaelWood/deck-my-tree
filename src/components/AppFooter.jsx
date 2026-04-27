export default function AppFooter({ onOpen }) {
  return (
    <footer className="app-footer">
      <nav className="footer-links">
        <button onClick={() => onOpen('privacy')}>Privacy Policy</button>
        <span>|</span>
        <button onClick={() => onOpen('terms')}>Terms of Service</button>
        <span>|</span>
        <button onClick={() => onOpen('about')}>About</button>
        <span>|</span>
        <button onClick={() => onOpen('contact')}>Contact</button>
        <span>|</span>
        <button onClick={() => onOpen('disclosure')}>Affiliate Disclosure</button>
      </nav>
      <p className="footer-disclosure">
        Deck My Tree is a participant in the Amazon Associates Program, Walmart Affiliate Program, and Etsy Affiliate Program. As an affiliate, we earn from qualifying purchases. This does not affect the price you pay.
      </p>
      <div className="footer-social">
        <a href="https://instagram.com/deckmytreeapp" target="_blank" rel="noopener noreferrer">Instagram</a>
        <span>·</span>
        <a href="https://tiktok.com/@deckmytreeapp" target="_blank" rel="noopener noreferrer">TikTok</a>
        <span>·</span>
        <a href="https://facebook.com/deckmytreeapp" target="_blank" rel="noopener noreferrer">Facebook</a>
      </div>
      <p className="footer-copy">© 2026 Deck My Tree LLC · hello@deckmytree.com</p>
    </footer>
  )
}
