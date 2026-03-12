import { Link } from 'react-router-dom';
import './AboutPage.css';

function AboutPage({ user }) {
  return (
    <article className="about-page">
      <h2 className="about-page-title">About</h2>

      <section className="about-section" aria-labelledby="about-what-heading">
        <h3 id="about-what-heading" className="about-heading">What is this site?</h3>
        <p className="about-text">
          Mutual Aid Library of Things is for <strong>sharing stuff for free</strong>. It works like a
          library of things: list what you have to share or what you need, and connect with others in
          your groups to borrow, lend, or help out—no money involved.
        </p>
      </section>

      <section className="about-section" aria-labelledby="about-uses-heading">
        <h3 id="about-uses-heading" className="about-heading">Who is it for?</h3>
        <p className="about-text">
          The site works for many kinds of groups, including:
        </p>
        <ul className="about-list">
          <li>Neighbors and neighborhood groups</li>
          <li>Friends and family</li>
          <li>Church or faith communities</li>
          <li>Local organizations, co-ops, and mutual aid networks</li>
        </ul>
        <p className="about-text">
          You don't need to be in just one group—you can be part of multiple groups and choose which
          things you share with which groups.
        </p>
      </section>

      <section className="about-section" aria-labelledby="about-getting-started-heading">
        <h3 id="about-getting-started-heading" className="about-heading">Getting started</h3>
        <ul className="about-list about-list-steps">
          <li>
            <strong>Start or join a group.</strong> Create a group (e.g. your building or community) and
            share the invite link, or use a link from someone else to join. Some groups require admin
            approval before you join.
          </li>
          <li>
            <strong>Add things or requests.</strong> From your profile, add things you can share (tools,
            gear, etc.) or requests for what you need. Choose which groups can see each item.
          </li>
          <li>
            <strong>Contact others.</strong> When you want to borrow something or respond to a request,
            use the "Request thing" or "Contact" button on the item. Your message is sent by email; the
            other person will see your email when they reply, so you can arrange the exchange.
          </li>
        </ul>
      </section>

      <section className="about-section" aria-labelledby="about-privacy-heading">
        <h3 id="about-privacy-heading" className="about-heading">Privacy</h3>
        <p className="about-text">
          When you contact someone (e.g. to request a thing or respond to a request), your message is
          sent by email. The other person will see your email when they reply so you can arrange the
          exchange. The site does not share your email with other members until you choose to contact
          them.
        </p>
      </section>

      <section className="about-section" aria-labelledby="about-feedback-heading">
        <h3 id="about-feedback-heading" className="about-heading">Feedback</h3>
        <p className="about-text">
          Questions or feedback? Use the Feedback link in the footer to get in touch.
        </p>
      </section>

      {user && (
        <p className="about-back">
          <Link to="/things" className="back-link">
            ← Back
          </Link>
        </p>
      )}
    </article>
  );
}

export default AboutPage;
