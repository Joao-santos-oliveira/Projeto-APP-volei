export default function Logo({ size = 28, showText = true, textStyle = {} }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, userSelect: 'none' }}>
      {/* Icon Mark */}
      <div style={{
        width: size,
        height: size,
        borderRadius: 4,
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-light)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0
      }}>
        <img
          src="/sideup-logo.png"
          alt="SIDEUP"
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
      </div>

      {/* Brand Text */}
      {showText && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1, ...textStyle }}>
          <div style={{
            fontFamily: 'Montserrat, sans-serif',
            fontSize: size >= 32 ? 18 : 14,
            fontWeight: 900,
            letterSpacing: '0.12em',
            color: '#FFFFFF'
          }}>
            SIDE<span style={{ color: 'var(--gold)' }}>UP</span>
          </div>
          <span style={{
            fontFamily: 'Space Grotesk, sans-serif',
            fontSize: 8,
            fontWeight: 800,
            letterSpacing: '0.16em',
            color: 'var(--gold)',
            marginTop: 3,
            textTransform: 'uppercase'
          }}>
            SCOUT & ANALYTICS
          </span>
        </div>
      )}
    </div>
  );
}
