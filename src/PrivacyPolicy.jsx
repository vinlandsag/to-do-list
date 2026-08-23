export default function PrivacyPolicy({ onBack }) {
  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px', lineHeight: '1.6', color: 'var(--ink)' }}>
      <button 
        onClick={onBack}
        style={{ 
          background: 'none', border: 'none', color: 'var(--purple)', 
          fontWeight: 'bold', fontSize: '14px', padding: '0 0 20px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '4px'
        }}
      >
        ← Back
      </button>

      <h1 style={{ fontFamily: '"Playfair Display", serif', fontSize: '32px', marginBottom: '8px' }}>Privacy Policy</h1>
      <p style={{ color: 'var(--muted)', fontSize: '14px', marginBottom: '32px' }}>Last updated: August 2026</p>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 'bold' }}>1. Introduction</h2>
        <p>Welcome to Flowlist. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or use our mobile application. Please read this privacy policy carefully. If you do not agree with the terms of this privacy policy, please do not access the application.</p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 'bold' }}>2. Data We Collect</h2>
        <p>We may collect information about you in a variety of ways. The information we may collect via the Application includes:</p>
        <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
          <li><strong>Personal Data:</strong> Demographics and other personally identifiable information (such as your name and email address) that you voluntarily give to us when you register.</li>
          <li><strong>Task Data:</strong> To-do items, projects, tags, priorities, and other data you input into Flowlist. This data is synced to our secure cloud infrastructure to enable cross-device functionality.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 'bold' }}>3. How We Use Your Data</h2>
        <p>Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you to:</p>
        <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
          <li>Create and manage your account.</li>
          <li>Sync your tasks and preferences across multiple devices.</li>
          <li>Send you scheduled reminders via local push notifications.</li>
        </ul>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 'bold' }}>4. Data Security</h2>
        <p>We use administrative, technical, and physical security measures to help protect your personal information (including Row Level Security databases). While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.</p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 'bold' }}>5. Your Rights & Data Portability</h2>
        <p>You have the right to request access to the personal data we hold about you, to request that your personal data be corrected or deleted, and to request a copy of your data in a portable format. You can export your data or delete your account entirely at any time from the Settings menu within the app.</p>
      </section>

      <section style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: 'bold' }}>6. Contact Us</h2>
        <p>If you have questions or comments about this Privacy Policy, please contact us at support@flowlist.app.</p>
      </section>
    </div>
  );
}
