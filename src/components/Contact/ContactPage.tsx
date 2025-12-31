import React, { useEffect, useState } from "react";
import css from "./ContactPage.module.css";

interface ProfileData {
  name: string;
  title: string;
  bio: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  website: string;
  avatarUrl: string;
}

const defaultProfile: ProfileData = {
  name: "Vikram Singh",
  title: "Full-Stack Engineer | Builder",
  bio: `I am a software engineer with over 10 years of experience in building scalable and user-friendly applications.

This family tree app is a personal effort to digitally preserve our village’s lineage, relationships, and cultural heritage for future generations.

If you have any feedback, corrections, or suggestions, feel free to contact me. Your input helps keep this data accurate and meaningful.`,
  email: "vikram5909015@gmail.com",
  phone: "+917015697157",
  linkedin: "linkedin.com/in/vikram-singh-17a50463/",
  github: "github.com/your-handle",
  website: "yourportfolio.com",
  avatarUrl:
    "https://firebasestorage.googleapis.com/v0/b/hotelmanager-c833b.firebasestorage.app/o/Screenshot_20251228_173624.jpg?alt=media&token=ed611029-4dcc-478d-8d89-5becaec52788",
};

interface ContactPageProps {
  onBack?: () => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({ onBack }) => {
  const [data, setData] = useState<ProfileData>(defaultProfile);
  const [padTop, setPadTop] = useState<number | undefined>(undefined);

  useEffect(() => {
    const saved = localStorage.getItem("contact-profile");
    if (saved) {
      try {
        setData({ ...defaultProfile, ...JSON.parse(saved) });
      } catch (err) {
        console.warn("Failed to parse saved profile", err);
      }
    }
  }, []);

  useEffect(() => {
    const updatePadding = () => {
      const header = document.querySelector("header");
      if (header) {
        const h = (header as HTMLElement).offsetHeight || 56;
        // On small screens, use 0 padding; on larger screens add breathing space
        const padding = window.innerWidth <= 640 ? 0 : h + 24;
        setPadTop(padding);
      }
    };
    updatePadding();
    window.addEventListener("resize", updatePadding);
    window.addEventListener("orientationchange", updatePadding);
    return () => {
      window.removeEventListener("resize", updatePadding);
      window.removeEventListener("orientationchange", updatePadding);
    };
  }, []);

  const phone = data.phone || defaultProfile.phone;
  const sanitizedPhone = phone.replace(/[^0-9]/g, "");
  const email = data.email || defaultProfile.email;
  const website = data.website || defaultProfile.website;

  return (
    <div
      className={css.page}
      style={padTop ? { paddingTop: padTop } : undefined}
    >
      <div className={css.card}>
        <header className={css.profileHeader}>
          <div className={css.avatarWrap}>
            <img
              src={data.avatarUrl || defaultProfile.avatarUrl}
              alt="avatar"
              className={css.avatar}
            />
          </div>
          <div className={css.name}>{data.name || "Your Name"}</div>
          <div className={css.title}>{data.title || defaultProfile.title}</div>
          <div className={css.tagline}>
            Preserving family history through technology.
          </div>
        </header>

        <section className={css.section}>
          <div className={css.sectionTitle}>About the Creator</div>
          <p className={css.paragraph}>{data.bio || defaultProfile.bio}</p>
          <p className={css.paragraph}>
            This app helps preserve lineage, relationships, and community
            stories for future generations.
          </p>
        </section>

        <section className={css.section}>
          <div className={css.sectionTitle}>Why I Built This App</div>
          <p className={css.paragraph}>
            Our family history is rich but often lives only in memory. I built
            this to keep our bonds and heritage accessible to everyone.
          </p>
          <p className={css.paragraph}>
            If you want a similar experience for your family or community, reach
            out and I will help set it up.
          </p>
        </section>

        <section className={css.section}>
          <div className={css.sectionTitle}>Contact</div>
          <div className={css.contactButtons}>
            <a
              className={`${css.contactButton} ${css.whatsapp}`}
              href={sanitizedPhone ? `https://wa.me/${sanitizedPhone}` : "#"}
              target="_blank"
              rel="noreferrer"
            >
              WhatsApp
            </a>
            <a
              className={`${css.contactButton} ${css.email}`}
              href={`mailto:${email}`}
            >
              Email Me
            </a>
            <a
              className={`${css.contactButton} ${css.linkedin}`}
              href={
                data.linkedin
                  ? `https://${data.linkedin.replace(/^https?:\/\//, "")}`
                  : "#"
              }
              target="_blank"
              rel="noreferrer"
            >
              LinkedIn
            </a>
          </div>
          <ul className={css.detailList}>
            <li>
              <span className={css.detailLabel}>Mobile:</span>
              <a href={`tel:${phone}`}>{phone}</a>
            </li>
            <li>
              <span className={css.detailLabel}>Email:</span>
              <a href={`mailto:${email}`}>{email}</a>
            </li>
            <li>
              <span className={css.detailLabel}>Website:</span>
              <a
                href={`https://${website.replace(/^https?:\/\//, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                {website}
              </a>
            </li>
          </ul>
        </section>

        <footer className={css.footerNote}>
          Built with ❤️ for the family and village community.
          {onBack && (
            <button
              className={`${css.button} ${css.secondary}`}
              onClick={onBack}
            >
              Back to Tree
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};
