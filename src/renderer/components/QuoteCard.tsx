import type { Quote, Settings } from '@shared/types'

type Language = Settings['display']['language']
type TextEffect = Settings['transition']['text']['effect']

interface Props {
  quote: Quote
  time: string
  language: Language
  effect: TextEffect
}

function highlightTimeString(text: string, timeString: string): JSX.Element {
  if (!timeString) return <>{text}</>
  const idx = text.toLowerCase().indexOf(timeString.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <mark className="time-highlight">{text.slice(idx, idx + timeString.length)}</mark>
      {text.slice(idx + timeString.length)}
    </>
  )
}

export function QuoteCard({ quote, time, language, effect }: Props): JSX.Element {
  return (
    <div className={`quote-card quote-card--${effect}`}>
      {(language === 'en' || language === 'both') && (
        <div className="quote-block quote-block--en">
          <blockquote className="quote-text">
            {highlightTimeString(quote.en.quote, quote.timeString)}
          </blockquote>
          <cite className="quote-attribution">
            <span className="quote-title">{quote.en.title}</span>
            {' — '}
            <span className="quote-author">{quote.en.author}</span>
          </cite>
        </div>
      )}
      {(language === 'ko' || language === 'both') && (
        <div className="quote-block quote-block--ko">
          <blockquote className="quote-text">{quote.ko.quote}</blockquote>
          <cite className="quote-attribution">
            <span className="quote-title">{quote.ko.title}</span>
            {' — '}
            <span className="quote-author">{quote.ko.author}</span>
          </cite>
        </div>
      )}
    </div>
  )
}
