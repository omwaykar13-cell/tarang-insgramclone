export default function Avatar({
  url,
  alt,
  size = 44,
  ring = false,
}: {
  url: string | null
  alt: string
  size?: number
  ring?: boolean
}) {
  const fallback = url?.trim()
  return (
    <div
      className={`avatar ${ring ? 'avatar-ring' : ''}`}
      style={{ width: size, height: size }}
    >
      {fallback ? (
        <img src={fallback} alt={alt} referrerPolicy="no-referrer" />
      ) : (
        <span className="avatar-initial">{alt.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  )
}
