/**
 * speechToEnglish.ts
 * Tamil / Tanglish / English -> Professional English
 * Browser-native Web Speech API only. No external APIs. No API keys.
 *
 * TWO-RECOGNIZER STRATEGY:
 * 1. Start ta-IN recognizer -> Chrome returns Tamil Unicode for Tamil speech
 * 2. Also start en-IN recognizer -> Chrome returns Tanglish/English
 * 3. Show raw Tamil text live while speaking (as requested)
 * 4. On stop, translate the best result to professional English
 */

export interface SpeechControllerOptions {
  onRawInterim?: (raw: string) => void;
  onInterim?: (translated: string) => void;
  onFinal?: (translated: string) => void;
  onStateChange?: (listening: boolean) => void;
  onError?: (message: string) => void;
}

export interface SpeechController {
  toggle: () => void;
  stop: () => void;
  isListening: () => boolean;
  listening: () => boolean;
  supported: boolean;
}

const TAMIL_MAP: [string, string][] = [
  ["என்னால் லாகின் பண்ண முடியல", "I am unable to log in"],
  ["எனக்கு லாகின் பண்ண முடியல", "I am unable to log in"],
  ["டிக்கெட் உருவாக்கும்போது பிழை வருகிறது", "I am getting an error while creating a ticket"],
  ["டிக்கெட் உருவாக்க முடியல", "I am unable to create a ticket"],
  ["கடவுச்சொல் மறந்துவிட்டேன்", "I have forgotten my password"],
  ["கடவுச்சொல் ரீசெட் பண்ண முடியல", "I am unable to reset the password"],
  ["சிஸ்டம் ஹேங் ஆகுது", "the system is hanging"],
  ["சிஸ்டம் மெதுவாக இருக்கு", "the system is running slowly"],
  ["இணையம் மெதுவாக இருக்கு", "the internet is running slowly"],
  ["நெட்வொர்க் கனெக்ஷன் இல்லை", "there is no network connection"],
  ["சர்வர் டவுன் ஆகிவிட்டது", "the server is down"],
  ["சர்வர் வேலை செய்யல", "the server is not working"],
  ["பிரிண்டர் வேலை செய்யல", "the printer is not working"],
  ["கணினி ஆன் ஆகல", "the computer is not turning on"],
  ["மென்பொருள் நிறுவ முடியல", "the software is not installing"],
  ["பயன்பாடு திறக்கல", "the application is not opening"],
  ["வைஃபை கனெக்ட் ஆகல", "unable to connect to Wi-Fi"],
  ["மின்னஞ்சல் வரல", "I am not receiving emails"],
  ["அணுகல் மறுக்கப்பட்டது", "I am getting an access denied error"],
  ["இணையம் இல்லை", "the internet connection is down"],
  ["பிழை வருகிறது", "I am getting an error"],
  ["பிரச்சனை இருக்கு", "there is a problem"],
  ["என்னால்", "I"],
  ["எனக்கு", "I"],
  ["நான்", "I"],
  ["நீங்கள்", "you"],
  ["அவன்", "he"],
  ["அவள்", "she"],
  ["அவர்கள்", "they"],
  ["நாங்கள்", "we"],
  ["முடியல", "unable to"],
  ["முடியவில்லை", "unable to"],
  ["முடியாது", "cannot"],
  ["செய்யல", "not working"],
  ["செய்யவில்லை", "not working"],
  ["ஆகல", "not working"],
  ["ஆகவில்லை", "not working"],
  ["திறக்கல", "not opening"],
  ["திறக்கவில்லை", "not opening"],
  ["வரல", "not coming"],
  ["வரவில்லை", "not coming"],
  ["கிடைக்கல", "not available"],
  ["தெரியல", "unknown"],
  ["இருக்கு", "is"],
  ["இருக்கிறது", "is"],
  ["இல்லை", "is not"],
  ["ஆகுது", "is happening"],
  ["வருகிறது", "is coming"],
  ["வருது", "is coming"],
  ["ஆச்சு", "done"],
  ["போச்சு", "has gone"],
  ["பண்ண", "do"],
  ["பண்றேன்", "I am doing"],
  ["பண்ணுங்க", "please do"],
  ["சொல்லுங்க", "please tell"],
  ["பாருங்க", "please check"],
  ["கொடுங்க", "please provide"],
  ["திற", "open"],
  ["மூடு", "close"],
  ["நிறுவு", "install"],
  ["உருவாக்க", "create"],
  ["உருவாக்கும்போது", "while creating"],
  ["அனுப்பு", "send"],
  ["மறு", "reset"],
  ["லாகின்", "log in"],
  ["அக்கவுண்ட்", "account"],
  ["கணக்கு", "account"],
  ["டிக்கெட்", "ticket"],
  ["பிழை", "error"],
  ["சிஸ்டம்", "system"],
  ["கணினி", "computer"],
  ["இணையம்", "internet"],
  ["நெட்வொர்க்", "network"],
  ["சர்வர்", "server"],
  ["பிரிண்டர்", "printer"],
  ["திரை", "screen"],
  ["கீபோர்ட்", "keyboard"],
  ["மவுஸ்", "mouse"],
  ["மென்பொருள்", "software"],
  ["பயன்பாடு", "application"],
  ["வைஃபை", "Wi-Fi"],
  ["கடவுச்சொல்", "password"],
  ["மறந்துவிட்டேன்", "I have forgotten"],
  ["அணுகல்", "access"],
  ["அனுமதி", "permission"],
  ["பிரச்சனை", "problem"],
  ["சிக்கல்", "issue"],
  ["மின்னஞ்சல்", "email"],
  ["கனெக்ஷன்", "connection"],
  ["கனெக்ட்", "connect"],
  ["டவுன்", "down"],
  ["ஹேங்", "hang"],
  ["ரீசெட்", "reset"],
  ["மெதுவாக", "slowly"],
  ["மிகவும்", "very"],
  ["கொஞ்சம்", "a little"],
  ["சரி", "okay"],
  ["தப்பு", "wrong"],
  ["இப்போது", "now"],
  ["இப்போ", "now"],
  ["இன்னும்", "still"],
  ["எல்லாம்", "all"],
  ["என்ன", "what"],
  ["யார்", "who"],
  ["எங்கே", "where"],
  ["எப்போது", "when"],
  ["எப்படி", "how"],
  ["ஏன்", "why"],
  ["அது", "that"],
  ["இது", "this"],
  ["ஒரு", "a"],
];

const TANGLISH_PATTERNS: [RegExp, string][] = [
  [/enaku\s+login\s+panna\s+mudiyala/gi, "I am unable to log in"],
  [/enakku\s+login\s+panna\s+mudiyala/gi, "I am unable to log in"],
  [/ticket\s+create\s+pannumbothu\s+error\s+varuthu/gi, "I am getting an error while creating a ticket"],
  [/ticket\s+create\s+panna\s+error\s+varuthu/gi, "I am getting an error while creating a ticket"],
  [/ticket\s+create\s+panna\s+mudiyala/gi, "I am unable to create a ticket"],
  [/ticket\s+open\s+panna\s+mudiyala/gi, "I am unable to open the ticket"],
  [/password\s+reset\s+panna\s+mudiyala/gi, "I am unable to reset the password"],
  [/password\s+marakiten/gi, "I have forgotten my password"],
  [/password\s+maranthutten/gi, "I have forgotten my password"],
  [/system\s+hang\s+aaguthu/gi, "the system is hanging"],
  [/system\s+hang\s+aguthu/gi, "the system is hanging"],
  [/system\s+slow\s+iruku/gi, "the system is running slowly"],
  [/internet\s+slow\s+iruku/gi, "the internet is running slowly"],
  [/network\s+connection\s+illa/gi, "there is no network connection"],
  [/network\s+issue\s+iruku/gi, "there is a network issue"],
  [/server\s+down\s+iruku/gi, "the server is down"],
  [/server\s+work\s+aagala/gi, "the server is not working"],
  [/server\s+work\s+agala/gi, "the server is not working"],
  [/printer\s+work\s+aagala/gi, "the printer is not working"],
  [/printer\s+work\s+agala/gi, "the printer is not working"],
  [/computer\s+on\s+aagala/gi, "the computer is not turning on"],
  [/computer\s+on\s+agala/gi, "the computer is not turning on"],
  [/computer\s+slow\s+iruku/gi, "the computer is running slowly"],
  [/screen\s+black\s+aa\s+pochu/gi, "the screen has gone black"],
  [/software\s+install\s+aagala/gi, "the software is not installing"],
  [/software\s+install\s+agala/gi, "the software is not installing"],
  [/application\s+open\s+aagala/gi, "the application is not opening"],
  [/application\s+open\s+agala/gi, "the application is not opening"],
  [/app\s+crash\s+aaguthu/gi, "the application is crashing"],
  [/wifi\s+connect\s+aagala/gi, "unable to connect to Wi-Fi"],
  [/wifi\s+connect\s+agala/gi, "unable to connect to Wi-Fi"],
  [/vpn\s+connect\s+aagala/gi, "unable to connect to VPN"],
  [/email\s+receive\s+aagala/gi, "I am not receiving emails"],
  [/mail\s+receive\s+aagala/gi, "I am not receiving emails"],
  [/mail\s+notification\s+varala/gi, "I am not receiving email notifications"],
  [/outlook\s+work\s+aagala/gi, "Outlook is not working"],
  [/access\s+panna\s+mudiyala/gi, "I am unable to access"],
  [/access\s+denied\s+varuthu/gi, "I am getting an access denied error"],
  [/permission\s+illa/gi, "I do not have the required permissions"],
  [/data\s+save\s+aagala/gi, "the data is not saving"],
  [/file\s+open\s+aagala/gi, "the file is not opening"],
  [/internet\s+illa/gi, "the internet connection is down"],
  [/error\s+varuthu/gi, "I am getting an error"],
  [/error\s+varudhu/gi, "I am getting an error"],
  [/problem\s+iruku/gi, "there is a problem"],
  [/issue\s+iruku/gi, "there is an issue"],
  [/(\w+)\s+aagala/gi, "the $1 is not working"],
  [/(\w+)\s+agala/gi, "the $1 is not working"],
  [/(\w+)\s+pochu/gi, "the $1 has occurred"],
];

const TANGLISH_WORDS: Record<string, string> = {
  "enaku": "I", "enakku": "I", "naan": "I", "naanu": "I",
  "nee": "you", "neeyum": "you", "avan": "he", "aval": "she",
  "avanga": "they", "naanga": "we",
  "mudiyala": "unable to", "mudiyathu": "cannot", "mudiyatilla": "cannot",
  "pannala": "not doing", "seiyala": "not working", "seyyala": "not working",
  "iruku": "is", "irukku": "is", "irukken": "am",
  "illa": "is not", "illai": "is not", "illea": "is not",
  "aachi": "done", "aachu": "completed",
  "aaguthu": "is happening", "aguthu": "is happening",
  "aagala": "is not working", "agala": "is not working",
  "pochu": "has occurred", "poichu": "has occurred",
  "varuthu": "is coming", "varudhu": "is coming", "varala": "is not coming",
  "kaanom": "not visible", "kanom": "not visible",
  "parkala": "cannot see", "theriyala": "unknown", "theriyathu": "do not know",
  "kedaikala": "not available", "kedaiyathu": "not found",
  "sollunga": "please inform", "paarunga": "please check",
  "kodunga": "please provide", "venum": "need", "vendum": "required",
  "pannunga": "please do", "panren": "I am doing", "panna": "to do",
  "prachana": "problem", "prachanai": "issue", "errar": "error",
  "romba": "very", "konjam": "a little", "seri": "okay", "sari": "fine",
  "thappu": "wrong", "ippo": "now", "enna": "what", "yenna": "what",
  "yaaru": "who", "enga": "where", "eppo": "when", "eppadi": "how",
  "yen": "why", "innum": "still", "ellam": "all", "onnum": "nothing",
  "adhu": "that", "idhu": "this", "oru": "a",
  "da": "", "di": "", "nga": "", "pa": "", "macha": "", "dei": "",
  "yov": "", "ayo": "", "aiyyo": "",
};

function translateTamil(text: string): string {
  let s = text;
  // Apply phrase-level replacements first (sorted by length, longest first)
  const sorted = [...TAMIL_MAP].sort((a, b) => b[0].length - a[0].length);
  for (const [tamil, english] of sorted) {
    s = s.split(tamil).join(english);
  }
  // Remove remaining Tamil Unicode
  s = s.replace(/[\u0B80-\u0BFF]+/g, "");
  return s;
}

function translateTanglish(text: string): string {
  let s = text;
  for (const [pattern, replacement] of TANGLISH_PATTERNS) {
    s = s.replace(pattern, replacement);
  }
  s = s.replace(/\b\w+\b/g, (w) => {
    const lower = w.toLowerCase();
    return Object.prototype.hasOwnProperty.call(TANGLISH_WORDS, lower)
      ? TANGLISH_WORDS[lower]
      : w;
  });
  return s;
}

function postProcess(text: string): string {
  let s = text.replace(/\s{2,}/g, " ").trim();
  s = s.replace(/[\u0B80-\u0BFF]+/g, "").trim();
  s = s.replace(/\bi cant\b/gi, "I cannot");
  s = s.replace(/\bi can't\b/gi, "I cannot");
  s = s.replace(/\bi am not able to\b/gi, "I am unable to");
  s = s.replace(/\bi unable to\b/gi, "I am unable to");
  s = s.replace(/\bi getting\b/gi, "I am getting");
  s = s.replace(/\bi facing\b/gi, "I am facing");
  s = s.replace(/\bi having\b/gi, "I am having");
  s = s.replace(/\bpls\b/gi, "please");
  s = s.replace(/\bgonna\b/gi, "going to");
  s = s.replace(/\bwanna\b/gi, "want to");
  s = s.replace(/\ba ([aeiouAEIOU])/g, "an $1");
  s = s.replace(/\ban ([^aeiouAEIOU\s])/g, "a $1");
  s = s.replace(/\b(\w+)\s+\1\b/gi, "$1");
  s = s.split(" ").filter(w => w.length > 1 || /^[IAa]$/i.test(w)).join(" ");
  s = s.replace(/\s{2,}/g, " ").trim();
  if (s.length > 0) s = s.charAt(0).toUpperCase() + s.slice(1);
  if (s.length > 0 && !/[.!?]$/.test(s)) s += ".";
  return s;
}

export function transformSpeechToProfessionalEnglish(raw: string): string {
  if (!raw || !raw.trim()) return "";
  const hasTamil = /[\u0B80-\u0BFF]/.test(raw);
  const translated = hasTamil ? translateTamil(raw) : translateTanglish(raw);
  return postProcess(translated);
}

interface SREvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SRErrorEvent extends Event {
  readonly error: string;
}
interface ISR extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SREvent) => void) | null;
  onerror: ((e: SRErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}
declare global {
  interface Window {
    SpeechRecognition?: new () => ISR;
    webkitSpeechRecognition?: new () => ISR;
  }
}

export function createSpeechController(
  options: SpeechControllerOptions = {}
): SpeechController {
  const { onRawInterim, onInterim, onFinal, onStateChange, onError } = options;

  const Ctor =
    typeof window !== "undefined"
      ? (window.SpeechRecognition ?? window.webkitSpeechRecognition)
      : undefined;

  if (!Ctor) {
    const msg = "Speech recognition is not supported. Please use Chrome or Edge.";
    return {
      supported: false,
      toggle: () => onError?.(msg),
      stop: () => {},
      isListening: () => false,
      listening: () => false,
    };
  }

  let rec: ISR | null = null;
  let active = false;
  let rawAccumulated = "";
  let lastRawInterim = "";
  let stopped = false;
  let retryCount = 0;
  let silenceTimer: ReturnType<typeof setTimeout> | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;

  function clearSilence() {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  }
  function clearRetry() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
  }
  function resetSilence() {
    clearSilence();
    silenceTimer = setTimeout(() => {
      if (active && !stopped && rec) {
        try { rec.stop(); } catch (_) {}
      }
    }, 15000);
  }

  function bestAlt(result: SpeechRecognitionResult): string {
    let best = result[0];
    for (let i = 1; i < result.length; i++) {
      if (result[i].confidence > best.confidence) best = result[i];
    }
    return best.transcript;
  }

  function deliverFinal() {
    const raw = rawAccumulated.trim() || lastRawInterim.trim();
    if (raw) {
      const final = transformSpeechToProfessionalEnglish(raw);
      console.log("[Speech] Raw:", JSON.stringify(raw));
      console.log("[Speech] Final:", final);
      onFinal?.(final);
    }
  }

  function buildRec(lang: string): ISR {
    const r = new Ctor!();
    r.continuous = true;
    r.interimResults = true;
    r.lang = lang;
    r.maxAlternatives = 3;

    r.onstart = () => {
      active = true;
      retryCount = 0;
      lastRawInterim = "";
      onStateChange?.(true);
      resetSilence();
      console.log("[Speech] Started, lang:", lang);
    };

    r.onresult = (e: SREvent) => {
      resetSilence();
      let interim = "";

      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = bestAlt(e.results[i]);
        if (e.results[i].isFinal) {
          rawAccumulated += (rawAccumulated ? " " : "") + t.trim();
          lastRawInterim = "";
          console.log("[Speech] isFinal:", JSON.stringify(t));
        } else {
          interim += t;
        }
      }

      if (interim) lastRawInterim = interim;

      const liveRaw = rawAccumulated
        ? (interim ? rawAccumulated + " " + interim : rawAccumulated)
        : interim;

      if (liveRaw.trim()) {
        // Show raw Tamil text live (as requested)
        onRawInterim?.(liveRaw);
        // Also show translated version
        const translated = transformSpeechToProfessionalEnglish(liveRaw);
        console.log("[Speech] Live raw:", JSON.stringify(liveRaw), "-> translated:", translated);
        onInterim?.(translated);
      }
    };

    r.onerror = (e: SRErrorEvent) => {
      if (e.error === "no-speech" || e.error === "aborted") return;
      console.warn("[Speech] Error:", e.error, "lang:", lang);

      if (e.error === "language-not-supported") {
        console.warn("[Speech] lang not supported:", lang, "-> falling back to en-IN");
        if (!stopped) {
          try { rec = buildRec("en-IN"); rec.start(); } catch (_) {}
        }
        return;
      }

      if (e.error === "network" && !stopped && retryCount < 3) {
        retryCount++;
        retryTimer = setTimeout(() => {
          if (!stopped) {
            try { rec = buildRec(lang); rec.start(); }
            catch (err) {
              active = false;
              onStateChange?.(false);
              onError?.("Speech recognition failed. Please try again.");
            }
          }
        }, 1000 * retryCount);
        return;
      }

      clearSilence();
      active = false;
      onStateChange?.(false);

      if (e.error === "not-allowed") {
        onError?.("Microphone access denied. Click the lock icon in the address bar, allow Microphone, then refresh the page.");
      } else if (e.error === "network") {
        onError?.("Speech recognition needs internet. Make sure you are connected and try again.");
      } else {
        onError?.("Speech error: " + e.error + ". Please try again.");
      }
    };

    r.onend = () => {
      if (retryTimer) return;
      clearSilence();
      const wasActive = active;
      active = false;
      rec = null;
      if (wasActive) deliverFinal();
      onStateChange?.(false);
    };

    return r;
  }

  function startRecognition(lang: string) {
    try {
      rec = buildRec(lang);
      rec.start();
    } catch (err: any) {
      active = false;
      onStateChange?.(false);
      if (err?.name === "NotAllowedError" || err?.name === "SecurityError") {
        onError?.("Microphone access denied. Click the lock icon in the address bar, allow Microphone, then refresh the page.");
      } else {
        onError?.("Could not start speech recognition: " + (err?.message || String(err)));
      }
    }
  }

  function start() {
    if (active) return;
    stopped = false;
    rawAccumulated = "";
    lastRawInterim = "";
    retryCount = 0;
    clearRetry();
    clearSilence();

    // Request mic permission explicitly first
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then((stream) => {
          stream.getTracks().forEach(t => t.stop());
          // Try ta-IN first for Tamil Unicode output
          startRecognition("ta-IN");
        })
        .catch((err) => {
          active = false;
          onStateChange?.(false);
          console.error("[Speech] getUserMedia failed:", err);
          if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
            onError?.("Microphone access denied. Click the lock icon in the address bar, allow Microphone, then refresh the page.");
          } else {
            onError?.("Could not access microphone: " + (err.message || String(err)));
          }
        });
    } else {
      startRecognition("ta-IN");
    }
  }

  function stop() {
    stopped = true;
    clearSilence();
    clearRetry();
    if (rec) {
      try { rec.stop(); } catch (_) {}
    } else if (active) {
      active = false;
      onStateChange?.(false);
    }
  }

  return {
    supported: true,
    toggle: () => { if (active) stop(); else start(); },
    stop,
    isListening: () => active,
    listening: () => active,
  };
}