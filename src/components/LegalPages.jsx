import { useState } from 'react'
import './LegalPages.css'

function LegalOverlay({ title, onClose, children }) {
  return (
    <div className="legal-overlay">
      <button className="legal-close" onClick={onClose}>✕</button>
      <div className="legal-content">
        <h1 className="legal-title">{title}</h1>
        {children}
      </div>
    </div>
  )
}

function PrivacyPage({ onClose }) {
  return (
    <LegalOverlay title="Privacy Policy" onClose={onClose}>
      <p className="legal-date">Last updated: April 2026</p>
      <div className="legal-body">
        <p>
          At Deck My Tree, we believe your privacy is as important as a perfectly placed topper on a ten-foot Fraser fir. This policy explains in plain language what information we collect, how we use it, and what we don't do with it. We've written this to be readable — not to bury important details in legalese.
        </p>

        <h2>Photos You Upload</h2>
        <p>
          When you upload a photo of your tree for AI analysis, that image is transmitted securely to the Anthropic Claude API so our AI stylist can examine it and generate personalized decoration advice. We do not store your photos on our servers. Once the API call completes and your results are returned, the image is not retained by Deck My Tree. Anthropic processes your data under their own privacy policy and data use agreements; you can review those at <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer">anthropic.com/privacy</a>.
        </p>
        <p>
          We recommend not uploading photos that include identifiable faces or sensitive personal details — just your beautiful tree.
        </p>

        <h2>Local Storage (Your Device)</h2>
        <p>
          To make your experience feel seamless, Deck My Tree uses your browser's built-in localStorage to save your ornament collection and recent tree decoration sessions. This data lives entirely on your device — it never leaves your browser unless you choose to share it. There is no account, no cloud sync, and no server-side database storing your personal decorating history.
        </p>
        <p>
          You can clear this data at any time through your browser settings. In Chrome, for example, go to Settings → Privacy and Security → Clear Browsing Data → Cached Images and Files / Site Data. In Safari, go to Settings → Safari → Clear History and Website Data.
        </p>

        <h2>No Accounts, No Email Collection</h2>
        <p>
          We do not require you to create an account to use Deck My Tree. We do not collect your email address unless you voluntarily contact us through our contact form. If you do reach out via the contact form, your name, email, and message are used solely to respond to your inquiry and are not added to any marketing list.
        </p>

        <h2>Google Fonts</h2>
        <p>
          Deck My Tree uses Google Fonts (specifically Playfair Display and Inter) for typography. When your browser loads these fonts, a request is sent to Google's servers. Google's privacy policy governs how that request is handled. You can review it at <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">policies.google.com/privacy</a>.
        </p>

        <h2>Affiliate Links and Third-Party Cookies</h2>
        <p>
          Some of the product links on Deck My Tree are affiliate links — meaning when you click through to Amazon, Walmart, Etsy, or other retailers and make a purchase, we may earn a small commission at no extra cost to you. These retailers operate their own tracking systems and set their own cookies when you visit their sites. Those cookies and tracking mechanisms are governed by each retailer's own privacy policy:
        </p>
        <p>
          <strong>Amazon:</strong> <a href="https://www.amazon.com/privacy" target="_blank" rel="noopener noreferrer">amazon.com/privacy</a><br />
          <strong>Walmart:</strong> <a href="https://www.walmart.com/help/article/walmart-privacy-policy" target="_blank" rel="noopener noreferrer">walmart.com privacy policy</a><br />
          <strong>Etsy:</strong> <a href="https://www.etsy.com/legal/privacy" target="_blank" rel="noopener noreferrer">etsy.com/legal/privacy</a>
        </p>
        <p>
          Deck My Tree itself does not set affiliate tracking cookies. The commission tracking occurs on the retailer's side after you navigate to their site.
        </p>

        <h2>What We Don't Do</h2>
        <p>
          We do not sell your personal data. We do not share your information with advertisers. We do not use Google Analytics, Facebook Pixel, or any advertising trackers. We do not build profiles on individual users for marketing purposes. We don't want to — it's not what this app is about.
        </p>

        <h2>Children's Privacy</h2>
        <p>
          Deck My Tree is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has submitted personal information through our contact form, please email us and we will remove it promptly.
        </p>

        <h2>Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time as the app evolves. The "last updated" date at the top reflects the most recent revision. We encourage you to review this page periodically.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about privacy? Reach us at <a href="mailto:hello@deckmytree.com">hello@deckmytree.com</a>. We're a small team and we actually read our inbox.
        </p>
      </div>
    </LegalOverlay>
  )
}

function TermsPage({ onClose }) {
  return (
    <LegalOverlay title="Terms of Service" onClose={onClose}>
      <p className="legal-date">Effective: April 2026</p>
      <div className="legal-body">
        <p>
          Welcome to Deck My Tree. By accessing or using this app, you agree to be bound by these Terms of Service. Please read them before using the service. If you don't agree, please don't use the app.
        </p>

        <h2>The Service</h2>
        <p>
          Deck My Tree is an AI-powered holiday styling tool provided for style inspiration and entertainment purposes. The app is provided "as-is" and "as-available" without warranties of any kind, express or implied. We make no guarantees about uptime, accuracy, or the continued availability of any feature.
        </p>

        <h2>AI Recommendations</h2>
        <p>
          The ornament suggestions, color palette advice, and decoration plans generated by our AI are recommendations only — not guarantees of aesthetic outcome or product availability. Holiday style is subjective, your tree is unique, and the AI is doing its enthusiastic best based on what it can see. We are not responsible if a recommended item sells out, ships in a different shade, or simply doesn't look the way you imagined once it arrives. Use the suggestions as a starting point and trust your own eye.
        </p>

        <h2>Affiliate Links and Commissions</h2>
        <p>
          Deck My Tree participates in affiliate programs including the Amazon Associates Program, Walmart Creator Affiliate Program, and Etsy Affiliate Program. When you click a shopping link and make a qualifying purchase, we may earn a commission. This commission comes from the retailer — it does not add any cost to your purchase price.
        </p>
        <p>
          Our AI recommendations are generated based on your tree's aesthetic needs, not on affiliate commission rates. We do not manipulate recommendations to steer you toward higher-commission products.
        </p>

        <h2>Acceptable Use</h2>
        <p>
          You agree to use Deck My Tree only for lawful, personal purposes. You may not:
        </p>
        <p>
          • Scrape or systematically download content from the app<br />
          • Reverse engineer, decompile, or attempt to extract source code<br />
          • Use automated bots, crawlers, or scrapers to interact with the service<br />
          • Upload images that contain illegal content, nudity, or material that violates others' rights<br />
          • Use the app in any way that could damage, disable, or impair the service or interfere with other users<br />
          • Resell or sublicense access to the app without written permission
        </p>

        <h2>Intellectual Property</h2>
        <p>
          All content, branding, and design elements of Deck My Tree — including the name, logo, and original copy — are owned by Deck My Tree LLC. The AI-generated decoration advice delivered to you during a session is yours to use for personal purposes. You may not republish or commercialize AI outputs in bulk.
        </p>

        <h2>Limitation of Liability</h2>
        <p>
          To the fullest extent permitted by applicable law, Deck My Tree LLC and its owners, employees, and contractors shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the app. This includes, without limitation, any purchasing decisions you make based on AI recommendations, any product you purchase that does not meet your expectations, or any data loss resulting from browser storage clearing.
        </p>
        <p>
          Our total liability to you for any claim arising from use of the service shall not exceed the amount you paid us in the twelve months preceding the claim — which, since the app is free to use, is zero dollars.
        </p>

        <h2>Changes to the App or Terms</h2>
        <p>
          We reserve the right to modify, suspend, or discontinue the app or any feature at any time without prior notice. We may also update these Terms at any time. The updated Terms become effective when posted. Continued use of the app after changes are posted constitutes acceptance of the new Terms.
        </p>

        <h2>Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the State of Missouri, without regard to conflict of law principles. Any disputes arising under these Terms shall be resolved in the courts located in Cape Girardeau County, Missouri.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these Terms? Email us at <a href="mailto:hello@deckmytree.com">hello@deckmytree.com</a>.
        </p>
      </div>
    </LegalOverlay>
  )
}

function AboutPage({ onClose }) {
  return (
    <LegalOverlay title="About Deck My Tree" onClose={onClose}>
      <div className="legal-body">
        <p>
          Deck My Tree is an AI-powered holiday styling app built on a simple belief: everyone deserves a beautifully decorated Christmas tree, regardless of budget, design experience, or how many years you've been winging it with a box of mixed ornaments from the garage.
        </p>

        <h2>How It Works</h2>
        <p>
          The process is straightforward. Snap a photo of your tree — bare, half-decorated, or already dressed but missing something. Our AI stylist, powered by Claude from Anthropic, analyzes the shape, density, and existing decorations. It then generates a custom decoration plan: color palette, ornament types, placement strategy, and specific product picks you can actually shop. From photo to plan in seconds.
        </p>
        <p>
          You can also build a digital ornament collection to track what you own, and browse curated holiday looks in the Sleigh the Look gallery for inspiration before you even touch a branch.
        </p>

        <h2>Built in Cape Girardeau, Missouri</h2>
        <p>
          Deck My Tree was built by William Wood, a designer and developer based in Cape Girardeau, Missouri. The app reflects a brand voice we think of as "equal parts grit and glide" — the no-nonsense warmth of the American heartland blended with the refined eye of coastal design culture. Holiday decorating shouldn't feel intimidating or exclusive. It should feel like the best version of you showing up for the season.
        </p>

        <h2>Powered by Claude AI</h2>
        <p>
          The intelligence behind the decoration advice comes from Claude, Anthropic's AI model. Claude has vision capabilities, which means it can actually look at your tree photo and respond to what it sees — not just generate generic suggestions. We chose Claude because of its thoughtful, nuanced responses and Anthropic's commitment to building AI that is safe and honest.
        </p>

        <h2>Our Mission</h2>
        <p>
          We want to take the guesswork out of holiday decorating. The big-box store aisle is overwhelming. Online shopping for ornaments is a gamble. And hiring a professional holiday decorator is out of reach for most families. Deck My Tree sits in that gap — giving you the confidence of expert guidance at zero cost. Your tree, your style, just better.
        </p>

        <h2>Get in Touch</h2>
        <p>
          We love hearing from people who've used the app — the wins, the wild color combinations, the trees that surprised them. Reach us at <a href="mailto:hello@deckmytree.com">hello@deckmytree.com</a>, or find us on Instagram and TikTok at <strong>@deckmytreeapp</strong>.
        </p>
      </div>
    </LegalOverlay>
  )
}

function ContactPage({ onClose }) {
  const [sent, setSent] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', message: '' })

  function handleChange(e) {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    setSent(true)
  }

  return (
    <LegalOverlay title="Contact Us" onClose={onClose}>
      <div className="legal-body">
        <p>
          Have a question, a feature request, or just want to share a photo of your finished tree? We'd genuinely love to hear from you. Deck My Tree is a small, independent project and every message gets read by a real person.
        </p>
        <p>
          Use the form below or reach out directly at <a href="mailto:hello@deckmytree.com">hello@deckmytree.com</a>. You can also find us on social media — we post tree inspo, behind-the-scenes peeks, and the occasional ornament deep-dive.
        </p>
        <p>
          <strong>Instagram:</strong> <a href="https://instagram.com/deckmytreeapp" target="_blank" rel="noopener noreferrer">@deckmytreeapp</a><br />
          <strong>TikTok:</strong> <a href="https://tiktok.com/@deckmytreeapp" target="_blank" rel="noopener noreferrer">@deckmytreeapp</a><br />
          <strong>Facebook:</strong> <a href="https://facebook.com/deckmytreeapp" target="_blank" rel="noopener noreferrer">facebook.com/deckmytreeapp</a>
        </p>

        {sent ? (
          <div className="legal-success">
            Thanks! We'll be in touch. 🎄
          </div>
        ) : (
          <form className="legal-form" onSubmit={handleSubmit}>
            <input
              className="legal-input"
              type="text"
              name="name"
              placeholder="Your name"
              value={form.name}
              onChange={handleChange}
              required
            />
            <input
              className="legal-input"
              type="email"
              name="email"
              placeholder="Your email"
              value={form.email}
              onChange={handleChange}
              required
            />
            <textarea
              className="legal-input"
              name="message"
              placeholder="Your message"
              rows={5}
              value={form.message}
              onChange={handleChange}
              required
            />
            <button type="submit" className="btn-primary" style={{ alignSelf: 'flex-start' }}>
              Send Message
            </button>
          </form>
        )}
      </div>
    </LegalOverlay>
  )
}

function DisclosurePage({ onClose }) {
  return (
    <LegalOverlay title="Affiliate Disclosure" onClose={onClose}>
      <p className="legal-date">Last updated: April 2026</p>
      <div className="legal-body">
        <p>
          Deck My Tree participates in affiliate marketing programs designed to help independent creators earn revenue by recommending products they genuinely believe in. Specifically, we are a participant in the following programs:
        </p>
        <p>
          <strong>Amazon Associates Program</strong> — Deck My Tree is a participant in the Amazon Services LLC Associates Program, an affiliate advertising program designed to provide a means for sites to earn advertising fees by advertising and linking to Amazon.com.<br /><br />
          <strong>Walmart Creator Affiliate Program</strong> — We participate in Walmart's affiliate program and may earn commissions on qualifying purchases made through Walmart links.<br /><br />
          <strong>Etsy Affiliate Program</strong> — We participate in the Etsy affiliate program and may earn commissions on qualifying purchases from Etsy sellers.
        </p>

        <h2>What This Means for You</h2>
        <p>
          When you click a product link on Deck My Tree and make a qualifying purchase, we may receive a small commission from the retailer. This commission comes at no additional cost to you — you pay the same price you would have paid anyway. The commission simply helps keep Deck My Tree running and free for everyone.
        </p>

        <h2>Our Recommendations Are Independent</h2>
        <p>
          The product recommendations you receive from our AI stylist are generated based on your tree's aesthetic needs — the color palette, ornament style, and overall look that will work best for your specific tree. Affiliate relationships do not influence the AI's suggestions. We only surface products we genuinely believe would look great on your tree, and we never prioritize higher-commission products over better-fit ones.
        </p>
        <p>
          We think that's the only way this works. If the recommendations aren't trustworthy, the app isn't useful. So we keep it honest.
        </p>

        <h2>Questions?</h2>
        <p>
          If you have any questions about our affiliate relationships or how product recommendations are generated, please reach out at <a href="mailto:hello@deckmytree.com">hello@deckmytree.com</a>.
        </p>
      </div>
    </LegalOverlay>
  )
}

export default function LegalPage({ name, onClose }) {
  const pages = {
    privacy: PrivacyPage,
    terms: TermsPage,
    about: AboutPage,
    contact: ContactPage,
    disclosure: DisclosurePage,
  }
  const Page = pages[name]
  if (!Page) return null
  return <Page onClose={onClose} />
}
