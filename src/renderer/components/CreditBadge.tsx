import type { Credit } from '@shared/types'

interface Props {
  credit: Credit
}

export function CreditBadge({ credit }: Props): JSX.Element | null {
  if (!credit.photographerName || credit.provider === 'local') return null

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>, url: string): void {
    e.preventDefault()
    window.api.openExternal(url)
  }

  return (
    <div className="credit-badge">
      <span>Photo by </span>
      <a href="#" onClick={(e) => handleClick(e, credit.photographerUrl)}>
        {credit.photographerName}
      </a>
      {credit.provider === 'unsplash' && (
        <>
          <span> on </span>
          <a href="#" onClick={(e) => handleClick(e, credit.sourceUrl)}>
            Unsplash
          </a>
        </>
      )}
    </div>
  )
}
