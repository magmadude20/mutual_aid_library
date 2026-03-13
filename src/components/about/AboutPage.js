import { Link } from 'react-router-dom';
import './AboutPage.css';

function AboutPage({ user }) {
  return (
    <article className="about-page">
      <h2 className="about-page-title">About</h2>

      <section className="about-section" aria-labelledby="about-what-heading">
        <h3 id="about-what-heading" className="about-heading">What is this site?</h3>
        <p className="about-text">
          It helps friends and neighbors share stuff with each other.
          <br />
          The goal is to create <a href="https://www.shareable.net/programs/library-of-things/" target="_blank" rel="noopener noreferrer">
          <strong>libraries of things</strong>
          </a> that get better as more people join them.
          <br />
          You can list what you have to share or what you need, and connect with others in
          your groups to borrow, lend, or help out.
          <br />
          <br />
          It's stupid that everyone has stuff they only use occasionally.
          <br />
          Like, it just doesn't make sense for everyone to have lawn mower that they MAYBE use once a week.
          Just share one between a few folks, ya know?
          <br />
          Or like... tools. How often do you use your shovel? Does everyone need their own shovel? Probably not.
          <br />
          Share stuff because it saves money. Or because it's less wasteful. Or because it's nice or whatever.
        </p>
      </section>

      <section className="about-section" aria-labelledby="about-uses-heading">
        <h3 id="about-uses-heading" className="about-heading">Who is it for?</h3>
        <p className="about-text">
          Anyone that wants to save money, be less wasteful, and/or build their community.
          <br />
          <br />
          Groups could be for:
        </p>
        <ul className="about-list">
          <li>Neighbors and neighborhood groups</li>
          <li>Friends and family</li>
          <li>Church or faith communities</li>
          <li>Local organizations, co-ops, and mutual aid networks</li>
        </ul>
        <p className="about-text">
          You don't need to be in just one group, and you can control which things you share with which groups
          (e.g. if you only trust your friends with your camera, you can share it with them and only them.)
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
          Other folks can't see your email address until you reach out to them.
          If you don't do anything, your email address is not shared with other folks.
          <br />
          Other users can only see your email address when you reach out to them or you reply to their email.
          Once you do, we send
          and email to them with your email address so that they can reply to you.

          Again, your email will not be shared with other members until you choose to contact them.
        </p>
      </section>

      <section className="about-section" aria-labelledby="about-breakage-heading">
        <h3 id="about-breakage-heading" className="about-heading">What if something is stolen or breaks?</h3>
        <p className="about-text">
          I'm sorry, but you're on your own.
          <br />
          Only lend to folks you trust. Or lend things you're willing to replace.
          <br />
          Keep in mind that <strong>you can share certain things with only a few groups</strong>, and other things more broadly.
          <br />
          Be nice and be responsible.
        </p>
      </section>

      <section className="about-section" aria-labelledby="about-feedback-heading">
        <h3 id="about-feedback-heading" className="about-heading">Feedback</h3>
        <p className="about-text">
          Questions or feedback? Reach out to {process.env.REACT_APP_FEEDBACK_EMAIL || 'an admin'}.
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
