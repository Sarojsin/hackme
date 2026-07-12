import type { LearningData, VocabularyWord, Quote, MusicTrack } from '../types';

interface Props {
  data: LearningData;
}

function VocabularyList({ words }: { words: VocabularyWord[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Vocabulary</h4>
      <div className="grid gap-2">
        {words.map((w, i) => (
          <div key={i} className="flex items-start justify-between gap-3 px-3 py-2 rounded-xl bg-muted/30 border border-border/20">
            <div>
              <p className="text-sm font-medium text-foreground">{w.english}</p>
              <p className="text-xs text-foreground/60">{w.nepali}</p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-foreground/50">{w.pronunciation}</p>
              <span className="inline-block text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded-full mt-0.5 capitalize">
                {w.category}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function QuoteCard({ quote }: { quote: Quote }) {
  return (
    <div className="px-4 py-3 rounded-xl bg-gradient-to-br from-primary/10 via-accent/5 to-transparent border border-border/20">
      <p className="text-sm text-foreground/90 italic leading-relaxed">"{quote.text}"</p>
      <p className="text-xs text-foreground/50 mt-2 font-medium">— {quote.author}</p>
      <span className="inline-block text-[10px] font-medium text-accent bg-accent/10 px-1.5 py-0.5 rounded-full mt-2 capitalize">
        {quote.language}
      </span>
    </div>
  );
}

function MusicList({ tracks }: { tracks: MusicTrack[] }) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold text-foreground/70 uppercase tracking-wider">Recommended Tracks</h4>
      <div className="grid gap-2">
        {tracks.map((track, i) => (
          <div key={i} className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-muted/30 border border-border/20">
            <div className="flex items-center gap-3">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{track.title}</p>
                <p className="text-xs text-foreground/60">{track.artist}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="inline-block text-[10px] font-medium text-foreground/50 bg-muted/60 px-1.5 py-0.5 rounded-full capitalize">
                {track.mood}
              </span>
              <p className="text-[10px] text-foreground/40 mt-0.5">{track.duration}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LearningCard({ data }: Props) {
  return (
    <div className="mt-2 w-full max-w-md space-y-3">
      {data.vocabulary && data.vocabulary.length > 0 && (
        <VocabularyList words={data.vocabulary} />
      )}
      {data.quote && <QuoteCard quote={data.quote} />}
      {data.music && data.music.length > 0 && (
        <MusicList tracks={data.music} />
      )}
    </div>
  );
}
