/* Yearly Budget Tracker: AI model names and request limits, in one place.
   Edit here when a model is renamed or a limit changes; nothing else in the site hard-codes them. */
window.YBT_MODELS={
  /* characters of statement text sent per request: keeps every answer small enough to finish */
  chunkChars:15000,
  /* most pictures (scanned pages) in one request */
  chunkImages:8,
  /* most text, in characters, for one whole run (all files, all requests) */
  totalChars:1500000,
  /* longest answer asked for, in tokens. If a provider says its limit is lower, the lower one is used. */
  maxOutput:16000,
  providers:{
    /* the model Claude starts with, and the ones shown next to the picker (use: big | mid | small) */
    anthropic:{
      default:'claude-haiku-5-5',
      tiers:[
        {id:'claude-opus-5-5',   name:'Opus 5.5',   use:'big'},
        {id:'claude-sonnet-5-5', name:'Sonnet 5.5', use:'mid'},
        {id:'claude-haiku-5-5',  name:'Haiku 5.5',  use:'small'}
      ]
    },
    /* OpenAI and Gemini: the key's own model list is searched; these words tell the small, fast ones from the big ones */
    openai:{ small:/mini|nano/i },
    gemini:{ small:/flash/i, big:/pro/i }
  }
};
