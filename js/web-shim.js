/* MyAhorros: storage layer for the stand-alone web version.
   Stands in for window.claude, like the Windows app's layer, and keeps every figure on the visitor's side:
   - "folder":  one data file in a folder they pick (Chrome or Edge on a computer, File System Access API),
                tracker-data.json plus Backups\tracker-data YYYY-MM-DD.json, the same files as the Windows app;
   - "drive":   the same file in their own Google Drive (scope drive.file: the site only sees files it made),
                kept on the device too, so it opens offline and uploads when the connection is back;
   - "browser": only in this browser (IndexedDB), with daily copies kept there and a reminder to download backups.
   Nothing is ever sent to the site's own server. */
(function(){
'use strict';
if(window.Neutralino) return;
window.YBT_WEB=true;
const CFG=window.YBT_CONFIG||{};
const FOLDER='Yearly Budget Tracker', FILE='tracker-data.json', BACKUPS='Backups', KEEP=30, KEEP_BROWSER=14;
const DAILY=/^tracker-data \d{4}-\d{2}-\d{2}\.json$/;
const DRIVE_SCOPE='https://www.googleapis.com/auth/drive.file';
const API='https://www.googleapis.com/drive/v3', UPLOAD='https://www.googleapis.com/upload/drive/v3';
const MODE_KEY='ybt.storage', DRIVE_KEY='ybt.drive', PICKED_KEY='ybt.picked', TOKEN_KEY='ybt.driveToken'; /* PICKED_KEY: the person chose where to save (the demo picks browser storage for them) */

const clone=o=>JSON.parse(JSON.stringify(o));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pad=n=>String(n).padStart(2,'0');
const today=()=>{ const d=new Date(); return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate()); };
const stamp=()=>{ const d=new Date(); return today()+' '+pad(d.getHours())+'.'+pad(d.getMinutes())+'.'+pad(d.getSeconds()); };
const hhmm=d=>pad(d.getHours())+':'+pad(d.getMinutes());
const dmy=s=>{ const m=String(s).match(/(\d{4})-(\d{2})-(\d{2})/); return m?m[3]+'/'+m[2]+'/'+m[1]:s; };
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmtN=n=>String(n).replace(/\B(?=(\d{3})+(?!\d))/g,lsGet('ybt.num')==='en'?',':'.');
const lsGet=k=>{ try{ return localStorage.getItem(k); }catch(_){ return null; } };
const lsSet=(k,v)=>{ try{ if(v==null) localStorage.removeItem(k); else localStorage.setItem(k,v); }catch(_){} };

/* ---------- text ---------- */
const TX={
  en:{
    chooseTitle:'Where should your tracker be saved?',
    about:'MyAhorros is a free budget and net worth tracker: income, expenses, investments and what you own, month by month, in English or Spanish.', privacyLink:'Privacy',
    chooseSub:'Your figures never go to this website. Pick where they’re kept; you can change it later in Settings.',
    folderT:'A folder on this computer', folderS:'One data file in a folder you choose, such as Documents, with a backup every day. Works offline. The same file the Windows app uses.',
    folderNo:'Needs Chrome or Edge on a computer.',
    driveT:'Your Google Drive', driveS:'Saved in your own Google Drive, so it’s the same on your phone and computer. Works offline and catches up when you’re back online. The site can only see the files it creates.',
    driveNo:'Not available on this site yet.', driveOffline:'Needs an internet connection to set up.',
    browserT:'Only in this browser', browserS:'Nothing to set up. Clearing your browsing data deletes it, so download a backup now and then.',
    recommended:'Recommended', cancel:'Cancel', keepBrowser:'Keep it in this browser', exampleBtn:'Just looking? Try it with example data',
    pickHint:'Pick a folder such as Documents. A “Yearly Budget Tracker” folder is made inside it, unless you pick one that already has your tracker.',
    pickedNotAllowed:'The browser didn’t allow saving in that folder. Pick another one, such as Documents.',
    reTitle:'Allow access to your tracker folder', reText:n=>`Your tracker is saved in the folder “${n}”. Your browser asks you to allow access again before the site can open it.`,
    allow:'Allow access', otherFolder:'Choose another folder', useBrowser:'Use this browser instead',
    reDenied:'Access wasn’t allowed. Try again, or choose another folder.',
    driveConnectTitle:'Connect your Google Drive', driveConnectText:'Sign in with Google to open your tracker from your Drive. A Google window opens; if nothing happens, allow pop-ups for this site.',
    connect:'Connect Google Drive', connecting:'Connecting…',
    driveFail:'Google Drive couldn’t be reached. Check your connection and try again.',
    driveDenied:'Google Drive access wasn’t given, so nothing was changed.',
    barSignIn:'Google Drive needs you to sign in again. Your changes are kept on this device until then.',
    driveHave:'Already using it on another device? Choose this and your tracker opens from your Drive.',
    restoreT:'Restore from Google Drive…', restoreHelp:'Open your tracker or one of its daily backups from your Google Drive.',
    restoreTitle:'Restore from Google Drive', restoreSub:'Pick the version to open. What’s on screen now is kept as a backup first.',
    restoreMain:'Your tracker in Drive', restoreDaily:d=>`Backup from ${d}`, restoreOther:'Backup', restoreNone:'There’s nothing in your Google Drive from this tracker yet.',
    restoreN:n=>`${n} transactions`, restoreOpen:'Open', restored:(w,n)=>`Opened ${w} from Google Drive: ${n} transactions. What was on screen was kept as a backup.`,
    loading:'Loading…',
    topDrive:'Connect Google Drive', topDriveHelp:'Save your tracker in your own Google Drive, the same on every device.',
    barStart:'Opened from this device. Connect to Google Drive to save your changes there and get the ones from your other devices.',
    barOffline:'You’re offline. Your changes are kept on this device and go to Google Drive when you’re back online.',
    barFolder:'The browser needs your permission again to save in your tracker folder. Your changes are kept until then.',
    barFolderFail:'Your tracker folder couldn’t be written to. Your changes are kept in this browser until it works again.',
    reconnect:'Sign in again', allowShort:'Allow',
    stDrive:t=>`Saved to Google Drive at ${t}.`, stDriveSaving:'Saving to Google Drive…', stDriveWait:'Changes waiting to go to Google Drive.', stDriveNever:'Not yet saved to Google Drive.',
    stFolder:t=>`Saved to the file at ${t}.`, stBrowser:'Saved in this browser.',
    conflictTitle:'Your tracker was changed somewhere else',
    conflictDrive:(t,n)=>`The copy in your Google Drive was changed ${t?'at '+t+' ':''}on another device or browser (${n} transactions), after this one last synced.`,
    conflictFolder:(t,n)=>`The data file was changed ${t?'at '+t+' ':''}by something else, such as the Windows app (${n} transactions).`,
    conflictMine:n=>`This screen has ${n} transactions with changes not saved there yet.`,
    useTheirs:'Open the newer one', useMine:'Keep the one on this screen', useMerge:'Merge both',
    conflictNote:'Whichever you don’t keep is saved as a backup first. “Merge both” keeps every transaction, account and setting from both versions; where both changed the same one, it keeps the one on this screen.',
    mergedBoth:'Merged both versions. The other one was kept as a backup.',
    landDemo:'See a demo', landStart:'Get started', landOpen:'Open my tracker', landMenu:'Sections',
    landH1:'Know where your money goes, and what you’re worth.',
    landSub:'A free, simple way to follow what you earn, spend and own. Your figures stay on your device or in your own Google Drive.',
    landNoSignup:'No account. No sign-up. Nothing leaves your device unless you choose.',
    landChip:'Free · No sign-up · Private',
    landCalls:['Your data stays on your device','Import from Excel','Read statements with AI'],
    landShotAlt:'The Net worth page with example figures: a total of 39.065 € and a chart of month-end totals that grows each month, with the last four months of the year in grey as a forecast.',
    landFeatT:'Everything in one place', landFeatSub:'Made for people who just want to know how they’re doing. No finance words needed.',
    landF:[['Income and expenses','Add what comes in and what goes out, by hand or with your bank’s file. It sorts everything into categories and puts each month side by side.'],
           ['Net worth over time','Once a month, type what each account holds. One chart shows your total growing through the year.'],
           ['Investments','See how much you put in, and how much your funds, shares or pension gained on their own.'],
           ['A look ahead','Grey months show where you’ll likely be by December if you carry on as you have this past year.']],
    landSafeT:'Your data stays yours', landSafe:'There is no account and no server holding your figures. Keep them in a folder, in your own Google Drive or only in this browser, with a daily backup. It works offline and installs like an app.',
    landHow:'How it works', landHowSteps:[['Choose where it lives','A folder, your Google Drive or your browser. You can change it any time.'],['Add what you own','A few accounts and what they were worth last month.'],['Add your transactions','By hand, by pasting a statement, or with AI.']],
    landEnd:'Ready when you are', landEndSub:'Take the two-minute tour with example data, or set up your own tracker.',
    landPrivacy:'Privacy',
    stDriveError:t=>`Couldn’t sync with Google Drive. Trying again at ${t}.`, stDrivePaused:'Sync is waiting until you finish what you’re doing.',
    keptTheirs:'Opened the newer version. The one on this screen was kept as a backup.', keptMine:'Kept the version on this screen. The other one was kept as a backup.',
    existsTitle:'There’s already a tracker there', existsText:(n,m)=>`It has ${n} transactions. The tracker open now has ${m}.`,
    useThere:'Use the one already there', replaceThere:'Replace it with the one open now', replaceNote:'If you replace it, the one already there is kept as a backup first.',
    moved:w=>`Your tracker is now saved ${w}.`, wFolder:'in your folder', wDrive:'in your Google Drive', wBrowser:'only in this browser',
    dataTitle:'Where your data is saved',
    subFolder:'Every change is saved straight away to this file, in the folder you chose on this computer.',
    subDrive:'Every change is saved on this device straight away and goes to your Google Drive a moment later.',
    subBrowser:'Every change is saved in this browser, on this device only. Clearing your browsing data deletes it, so download a backup now and then.',
    bkFolder:'Before your first change each day, a copy of your data is kept for 30 days in:',
    bkDrive:'Before your first change each day, a copy of your data is kept for 30 days in your Google Drive:',
    bkBrowser:'A copy from each of the last 14 days is kept in this browser. It’s deleted too if the browser’s data is cleared.',
    bkBrowserWhere:'This browser · last 14 days',
    safeFolder:'Your figures are saved in a file in the folder you chose, with a daily backup.',
    safeDrive:'Your figures are saved in your Google Drive, with a daily backup there.',
    safeBrowser:'Your figures are saved only in this browser. Download a backup now and then from Settings.',
    change:'Change where it’s saved…', changeHelp:'Move your tracker to a folder, your Google Drive or this browser.',
    syncNow:'Sync now', syncNowHelp:'Upload the latest changes and check for newer ones from your other devices.',
    disconnect:'Disconnect Google Drive', disconnectHelp:'Keep the tracker only in this browser. The file in your Drive stays there.',
    saveCopy:'Save a backup…', saveCopyHelp:'Save a copy of everything as a file.',
    copyName:d=>`MyAhorros backup ${d}.json`, copySaved:n=>`Backup saved: ${n}`, copyDownloaded:n=>`Backup downloaded: ${n}`, copyFailed:'The backup couldn’t be saved.',
    openTitle:'Open a tracker data file or backup',
    cantRead:'That file couldn’t be read, so nothing was changed.', notTracker:'That isn’t a tracker data file, so nothing was changed.',
    opened:(n,c)=>`Opened ${n}: ${c} ${c==='1'?'transaction':'transactions'}. Your previous data was kept as a backup first.`,
    freshTitle:'Start fresh?', freshText:'This deletes every transaction, category, keyword and setting from the tracker. A backup of your data is kept first.',
    startFailTitle:'Your tracker didn’t open', startFailFolder:'Your tracker folder couldn’t be read just now. If the Windows app has the file open, close it, then try again.',
    startFailDrive:'Your tracker couldn’t be opened from Google Drive just now. Check your connection, then try again.', tryAgain:'Try again',
    freshYes:'Delete everything', freshDone:'Started fresh. Your previous data was kept as a backup.',
    restoreBT:'Restore a backup…', restoreBHelp:'Open one of the copies kept in this browser: the daily ones, and those made before starting fresh, opening a file or restoring.',
    restoreBTitle:'Restore a backup', restoreBNone:'There are no backups in this browser yet.',
    restoredB:(w,n)=>`Opened ${w}: ${n} transactions. What was on screen was kept as a backup.`,
    itpWarn:'This browser also deletes it if you don’t open the site for 7 days. Add the site to your Home Screen (or Dock), or pick Google Drive.',
    tabTitle:'Open in another tab', tabText:'MyAhorros was opened in another tab or window. This one stopped saving so the two don’t overwrite each other.', tabHere:'Use it here',
    safetyFail:'The backup couldn’t be saved first, so nothing was changed.', writeFail:'Your data couldn’t be saved, so nothing was changed.',
    synced:'Up to date with Google Drive.', pulled:'Loaded the newer version from Google Drive.',
    dlBackup:'Download a backup', jsonFilter:'Tracker data or backup'
  },
  es:{
    chooseTitle:'¿Dónde quieres guardar tu control?',
    about:'MyAhorros es un control gratuito de presupuesto y patrimonio: ingresos, gastos, inversiones y lo que tienes, mes a mes, en español o en inglés.', privacyLink:'Privacidad',
    chooseSub:'Tus cifras nunca llegan a esta web. Elige dónde se guardan; puedes cambiarlo luego en Ajustes.',
    folderT:'Una carpeta de este ordenador', folderS:'Un archivo de datos en la carpeta que elijas, como Documentos, con una copia cada día. Funciona sin conexión. Es el mismo archivo que usa la aplicación de Windows.',
    folderNo:'Necesita Chrome o Edge en un ordenador.',
    driveT:'Tu Google Drive', driveS:'Se guarda en tu propio Google Drive, así que es el mismo en el móvil y en el ordenador. Funciona sin conexión y se pone al día al volver a conectarte. La web solo puede ver los archivos que crea.',
    driveNo:'Todavía no está disponible en esta web.', driveOffline:'Necesita conexión a internet para configurarlo.',
    browserT:'Solo en este navegador', browserS:'No hay nada que configurar. Si borras los datos de navegación se borra, así que descarga una copia de vez en cuando.',
    recommended:'Recomendado', cancel:'Cancelar', keepBrowser:'Dejarlo en este navegador', exampleBtn:'¿Solo quieres echar un vistazo? Pruébalo con datos de ejemplo',
    pickHint:'Elige una carpeta como Documentos. Dentro se crea una carpeta «Yearly Budget Tracker», salvo que elijas una que ya tenga tu control.',
    pickedNotAllowed:'El navegador no permite guardar en esa carpeta. Elige otra, como Documentos.',
    reTitle:'Permite el acceso a la carpeta de tu control', reText:n=>`Tu control se guarda en la carpeta «${n}». El navegador pide que vuelvas a permitir el acceso antes de abrirlo.`,
    allow:'Permitir el acceso', otherFolder:'Elegir otra carpeta', useBrowser:'Usar este navegador',
    reDenied:'No se ha permitido el acceso. Vuelve a intentarlo o elige otra carpeta.',
    driveConnectTitle:'Conecta tu Google Drive', driveConnectText:'Inicia sesión con Google para abrir tu control desde tu Drive. Se abre una ventana de Google; si no pasa nada, permite las ventanas emergentes en esta web.',
    connect:'Conectar Google Drive', connecting:'Conectando…',
    driveFail:'No se ha podido conectar con Google Drive. Revisa la conexión y vuelve a intentarlo.',
    driveDenied:'No se ha dado acceso a Google Drive, así que no se ha cambiado nada.',
    barSignIn:'Google Drive necesita que vuelvas a iniciar sesión. Hasta entonces, tus cambios se guardan en este dispositivo.',
    driveHave:'¿Ya lo usas en otro dispositivo? Elige esta opción y tu control se abre desde tu Drive.',
    restoreT:'Restaurar desde Google Drive…', restoreHelp:'Abre tu control o una de sus copias diarias desde tu Google Drive.',
    restoreTitle:'Restaurar desde Google Drive', restoreSub:'Elige la versión que quieres abrir. Antes se guarda una copia de lo que hay ahora en pantalla.',
    restoreMain:'Tu control en Drive', restoreDaily:d=>`Copia del ${d}`, restoreOther:'Copia', restoreNone:'Todavía no hay nada de este control en tu Google Drive.',
    restoreN:n=>`${n} movimientos`, restoreOpen:'Abrir', restored:(w,n)=>`Abierto ${w} desde Google Drive: ${n} movimientos. Lo que había en pantalla se ha guardado como copia.`,
    loading:'Cargando…',
    topDrive:'Conectar Google Drive', topDriveHelp:'Guarda tu control en tu propio Google Drive, igual en todos tus dispositivos.',
    barStart:'Abierto desde este dispositivo. Conecta Google Drive para guardar allí tus cambios y recibir los de tus otros dispositivos.',
    barOffline:'Estás sin conexión. Tus cambios se guardan en este dispositivo y pasan a Google Drive al volver a conectarte.',
    barFolder:'El navegador necesita tu permiso otra vez para guardar en la carpeta de tu control. Hasta entonces, tus cambios se conservan.',
    barFolderFail:'No se ha podido escribir en la carpeta de tu control. Tus cambios se guardan en este navegador hasta que vuelva a funcionar.',
    reconnect:'Volver a iniciar sesión', allowShort:'Permitir',
    stDrive:t=>`Guardado en Google Drive a las ${t}.`, stDriveSaving:'Guardando en Google Drive…', stDriveWait:'Hay cambios pendientes de subir a Google Drive.', stDriveNever:'Todavía no se ha guardado en Google Drive.',
    stFolder:t=>`Guardado en el archivo a las ${t}.`, stBrowser:'Guardado en este navegador.',
    conflictTitle:'Tu control ha cambiado en otro sitio',
    conflictDrive:(t,n)=>`La copia de tu Google Drive se cambió ${t?'a las '+t+' ':''}en otro dispositivo o navegador (${n} movimientos), después de la última sincronización de este.`,
    conflictFolder:(t,n)=>`El archivo de datos lo ha cambiado ${t?'a las '+t+' ':''}otro programa, como la aplicación de Windows (${n} movimientos).`,
    conflictMine:n=>`Esta pantalla tiene ${n} movimientos con cambios que aún no se han guardado allí.`,
    useTheirs:'Abrir la versión más nueva', useMine:'Quedarme con la de esta pantalla', useMerge:'Combinar las dos',
    conflictNote:'La que no elijas se guarda antes como copia de seguridad. «Combinar las dos» conserva todos los movimientos, cuentas y ajustes de ambas versiones; si las dos cambiaron el mismo, se queda con el de esta pantalla.',
    mergedBoth:'Se han combinado las dos versiones. La otra se guardó como copia de seguridad.',
    landDemo:'Ver una demo', landStart:'Empezar', landOpen:'Abrir mi control', landMenu:'Secciones',
    landH1:'Sabe a dónde va tu dinero y cuánto vales.',
    landSub:'Una forma gratuita y sencilla de seguir lo que ganas, gastas y tienes. Tus cifras se quedan en tu dispositivo o en tu propio Google Drive.',
    landNoSignup:'Sin cuenta. Sin registro. Nada sale de tu dispositivo si tú no quieres.',
    landChip:'Gratis · Sin registro · Privado',
    landCalls:['Tus datos se quedan en tu dispositivo','Importa desde Excel','Lee extractos con IA'],
    landShotAlt:'La página de Patrimonio con cifras de ejemplo: un total de 39.065 € y un gráfico de totales a fin de mes que crece cada mes, con los cuatro últimos meses del año en gris como previsión.',
    landFeatT:'Todo en un mismo sitio', landFeatSub:'Pensado para quien solo quiere saber cómo va. Sin palabras de finanzas.',
    landF:[['Ingresos y gastos','Apunta lo que entra y lo que sale, a mano o con el archivo de tu banco. Lo ordena todo en categorías y pone cada mes al lado del anterior.'],
           ['Tu patrimonio mes a mes','Una vez al mes, escribe cuánto hay en cada cuenta. Un gráfico te enseña cómo crece tu total a lo largo del año.'],
           ['Inversiones','Ve cuánto has aportado y cuánto han ganado solos tus fondos, acciones o plan de pensiones.'],
           ['Mirada al futuro','Los meses en gris te enseñan dónde estarás seguramente en diciembre si sigues como este último año.']],
    landSafeT:'Tus datos son tuyos', landSafe:'No hay cuenta ni servidor con tus cifras. Guárdalas en una carpeta, en tu propio Google Drive o solo en este navegador, con copia diaria. Funciona sin conexión y se instala como una app.',
    landHow:'Cómo funciona', landHowSteps:[['Elige dónde vive','Una carpeta, tu Google Drive o tu navegador. Puedes cambiarlo cuando quieras.'],['Añade lo que tienes','Unas cuentas y lo que valían el mes pasado.'],['Añade tus movimientos','A mano, pegando un extracto o con IA.']],
    landEnd:'Cuando quieras', landEndSub:'Haz el recorrido de dos minutos con datos de ejemplo, o configura tu propio control.',
    landPrivacy:'Privacidad',
    stDriveError:t=>`No se ha podido sincronizar con Google Drive. Se reintentará a las ${t}.`, stDrivePaused:'La sincronización espera a que termines lo que estás haciendo.',
    keptTheirs:'Abierta la versión más nueva. La de esta pantalla se ha guardado como copia.', keptMine:'Te has quedado con la versión de esta pantalla. La otra se ha guardado como copia.',
    existsTitle:'Ya hay un control ahí', existsText:(n,m)=>`Tiene ${n} movimientos. El control abierto ahora tiene ${m}.`,
    useThere:'Usar el que ya está', replaceThere:'Sustituirlo por el abierto ahora', replaceNote:'Si lo sustituyes, antes se guarda una copia del que ya estaba.',
    moved:w=>`Tu control se guarda ahora ${w}.`, wFolder:'en tu carpeta', wDrive:'en tu Google Drive', wBrowser:'solo en este navegador',
    dataTitle:'Dónde se guardan tus datos',
    subFolder:'Cada cambio se guarda al momento en este archivo, en la carpeta que elegiste de este ordenador.',
    subDrive:'Cada cambio se guarda al momento en este dispositivo y pasa a tu Google Drive unos segundos después.',
    subBrowser:'Cada cambio se guarda en este navegador, solo en este dispositivo. Si borras los datos de navegación se borra, así que descarga una copia de vez en cuando.',
    bkFolder:'Antes del primer cambio de cada día se guarda una copia de tus datos durante 30 días en:',
    bkDrive:'Antes del primer cambio de cada día se guarda una copia de tus datos durante 30 días en tu Google Drive:',
    bkBrowser:'Se guarda en este navegador una copia de cada uno de los últimos 14 días. También se borra si se borran los datos del navegador.',
    bkBrowserWhere:'Este navegador · últimos 14 días',
    safeFolder:'Tus cifras se guardan en un archivo de la carpeta que elegiste, con una copia diaria.',
    safeDrive:'Tus cifras se guardan en tu Google Drive, con una copia diaria allí.',
    safeBrowser:'Tus cifras se guardan solo en este navegador. Descarga una copia de vez en cuando desde Ajustes.',
    change:'Cambiar dónde se guarda…', changeHelp:'Lleva tu control a una carpeta, a tu Google Drive o a este navegador.',
    syncNow:'Sincronizar ahora', syncNowHelp:'Sube los últimos cambios y mira si hay otros más nuevos de tus otros dispositivos.',
    disconnect:'Desconectar Google Drive', disconnectHelp:'Guarda el control solo en este navegador. El archivo de tu Drive se queda allí.',
    saveCopy:'Guardar una copia de seguridad…', saveCopyHelp:'Guarda una copia de todo en un archivo.',
    copyName:d=>`Control de presupuesto copia de seguridad ${d}.json`, copySaved:n=>`Copia guardada: ${n}`, copyDownloaded:n=>`Copia descargada: ${n}`, copyFailed:'No se ha podido guardar la copia.',
    openTitle:'Abrir un archivo de datos o una copia del control',
    cantRead:'No se ha podido leer ese archivo, así que no se ha cambiado nada.', notTracker:'Ese no es un archivo de datos del control, así que no se ha cambiado nada.',
    opened:(n,c)=>`Abierto ${n}: ${c} ${c==='1'?'movimiento':'movimientos'}. Antes se ha guardado una copia de lo que había.`,
    freshTitle:'¿Empezar de cero?', freshText:'Esto borra todos los movimientos, categorías, palabras clave y ajustes del control. Antes se guarda una copia de seguridad.',
    startFailTitle:'Tu control no se ha abierto', startFailFolder:'No se ha podido leer la carpeta de tu control. Si la app de Windows tiene el archivo abierto, ciérrala y vuelve a intentarlo.',
    startFailDrive:'No se ha podido abrir tu control desde Google Drive. Comprueba la conexión y vuelve a intentarlo.', tryAgain:'Reintentar',
    freshYes:'Borrarlo todo', freshDone:'Has empezado de cero. Tus datos anteriores se han guardado como copia.',
    restoreBT:'Restaurar una copia…', restoreBHelp:'Abre una de las copias guardadas en este navegador: las diarias y las que se hacen antes de empezar de cero, abrir un archivo o restaurar.',
    restoreBTitle:'Restaurar una copia', restoreBNone:'Todavía no hay copias en este navegador.',
    restoredB:(w,n)=>`Se ha abierto ${w}: ${n} movimientos. Lo que había en pantalla se ha guardado como copia.`,
    itpWarn:'Este navegador también lo borra si no abres la web en 7 días. Añádela a la pantalla de inicio (o al Dock), o elige Google Drive.',
    tabTitle:'Abierto en otra pestaña', tabText:'MyAhorros se ha abierto en otra pestaña o ventana. Esta ha dejado de guardar para que las dos no se sobrescriban.', tabHere:'Usarlo aquí',
    safetyFail:'No se ha podido guardar antes la copia, así que no se ha cambiado nada.', writeFail:'No se han podido guardar tus datos, así que no se ha cambiado nada.',
    synced:'Al día con Google Drive.', pulled:'Cargada la versión más nueva de Google Drive.',
    dlBackup:'Descargar una copia', jsonFilter:'Datos o copia del control'
  }
};
let store=null;   /* {months:{YYYY-MM:{income,expenses,investments}}, config:{categories,keywords,settings,networth}} */
/* the page passes its language whenever it asks for text; that's the one on screen */
let pageLang=null;
const seeLang=l=>{ if(l==='es'||l==='en'){ pageLang=l; document.documentElement.lang=l; } };   /* lang: screen readers read the page in it */
function lang(){
  if(pageLang) return pageLang;
  const s=store&&store.config&&store.config.settings; if(s&&(s.lang==='es'||s.lang==='en')) return s.lang;
  const v=lsGet('ybt.lang'); if(v==='es'||v==='en') return v;
  return /^es\b/i.test(navigator.language||'')?'es':'en';
}
function t(k,...a){ const v=TX[lang()][k]; return typeof v==='function'?v(...a):v; }

/* ---------- data ---------- */
function normalise(d){
  if(!d||typeof d!=='object'||Array.isArray(d)) return null;
  if(!d.months&&d.db&&typeof d.db==='object') d=d.db;
  const months=d.months; if(!months||typeof months!=='object'||Array.isArray(months)) return null;
  const cfg=d.config&&typeof d.config==='object'?d.config:{categories:d.categories,keywords:d.keywords,settings:d.settings};
  const out={months:{},config:{}};
  for(const [k,v] of Object.entries(months)) if(/^\d{4}-\d{2}$/.test(k)&&v&&typeof v==='object') out.months[k]=v;
  for(const k of ['categories','keywords','settings','networth']) if(cfg[k]&&typeof cfg[k]==='object') out.config[k]=cfg[k];
  return out;
}
function parseData(text){ try{ return normalise(JSON.parse(String(text).replace(/^﻿/,''))); }catch(_){ return null; } }
function serialise(d){ d=d||store; return JSON.stringify({app:'Yearly Budget Tracker',format:1,savedAt:new Date().toISOString(),months:d.months,config:d.config}); }
function countTx(d){ let n=0; if(!d) return 0; for(const m of Object.values(d.months||{})) for(const k of ['income','expenses','investments']) n+=Array.isArray(m[k])?m[k].length:0; return n; }
const empty=()=>({months:{},config:{}});
/* stored text that can't be read starts an empty tracker, but is kept first as a browser backup, so the next save
   doesn't overwrite the only copy */
async function readStored(text){ const d=text&&parseData(text);
  if(text&&!d) await browser.keepCopy(typeof text==='string'?text:JSON.stringify(text),'unreadable').catch(()=>{});
  return d||empty(); }
const nothingAdded=d=>{ if(!d) return true; if(countTx(d)) return false; const n=d.config&&d.config.networth; return !(n&&((n.accounts||[]).length||Object.keys(n.snaps||{}).length)); };
const isEmpty=d=>!d||(!countTx(d)&&!Object.keys(d.config||{}).length);

/* ---------- IndexedDB (browser storage, the Drive copy on this device, the folder's handle) ---------- */
const idb={
  _db:null,
  open(){ if(this._db) return this._db;
    this._db=new Promise((res,rej)=>{ let r; try{ r=indexedDB.open('yearly-budget-tracker',1); }catch(e){ rej(e); return; }
      r.onupgradeneeded=()=>{ r.result.createObjectStore('kv'); };
      r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
    return this._db; },
  async tx(mode,fn){ const db=await this.open(); return new Promise((res,rej)=>{ const x=db.transaction('kv',mode), s=x.objectStore('kv'); let out; const q=fn(s); if(q) q.onsuccess=()=>{ out=q.result; }; x.oncomplete=()=>res(out); x.onerror=()=>rej(x.error); x.onabort=()=>rej(x.error); }); },
  get(k){ return this.tx('readonly',s=>s.get(k)); },
  set(k,v){ return this.tx('readwrite',s=>s.put(v,k)); },
  del(k){ return this.tx('readwrite',s=>s.delete(k)); },
  keys(){ return this.tx('readonly',s=>s.getAllKeys()); }
};
let persistAsked=false;
function askPersist(){ if(persistAsked) return; persistAsked=true; try{ if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{}); }catch(_){} }

/* ---------- what this browser can do ---------- */
const isMobile=()=>/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent||'')||(navigator.userAgentData&&navigator.userAgentData.mobile);
const canFolder=()=>typeof window.showDirectoryPicker==='function'&&!isMobile();
/* Safari, and every browser on iPhone/iPad, deletes a site's storage after 7 days without a visit, unless the site is installed */
const itp=()=>{ const u=navigator.userAgent||'';
  const webkit=/iPhone|iPad|iPod/.test(u)||/Macintosh/.test(u)&&navigator.maxTouchPoints>1||/Safari\//.test(u)&&!/Chrome|Chromium|CriOS|FxiOS|Edg|Android/.test(u);
  let installed=false; try{ installed=navigator.standalone===true||matchMedia('(display-mode: standalone)').matches; }catch(_){}
  return webkit&&!installed; };
const canDrive=()=>!!CFG.googleClientId;

/* ---------- saving: one at a time, a failure never stops the next ---------- */
let queue=Promise.resolve(), pending=0;
function enqueue(step){ pending++; const p=queue.then(step).finally(()=>{ pending--; }); queue=p.catch(()=>{}); return p; }

/* ======================================================================================
   backend: this browser only
   ====================================================================================== */
const browser={
  kind:'browser',
  async read(){ const v=await idb.get('data'); return typeof v==='string'?v:null; },
  async write(text){ await this.backup(); await idb.set('data',text); askPersist(); lastSaved=new Date(); },
  async backup(){ const d=today(); if(this._bk===d) return; this._bk=d;
    try{ const cur=await idb.get('data'); if(typeof cur==='string'&&!(await idb.get('bk:'+d))) await idb.set('bk:'+d,cur);
      const ks=(await idb.keys()).filter(k=>/^bk:\d{4}-\d{2}-\d{2}$/.test(k)).sort();
      for(const k of ks.slice(0,Math.max(0,ks.length-KEEP_BROWSER))) await idb.del(k); }catch(_){} },
  async keepCopy(text,label){ await idb.set('bk:'+label+' '+stamp(),text);
    /* the labelled safety copies (before opening a file, starting fresh...) keep the newest 20; the daily ones are pruned in backup() */
    try{ const ks=(await idb.keys()).map(String).filter(k=>/^bk:(?!\d{4}-\d{2}-\d{2}$)/.test(k)).sort((a,b)=>a.slice(-19)<b.slice(-19)?-1:1);
      for(const k of ks.slice(0,Math.max(0,ks.length-20))) await idb.del(k); }catch(_){} },
  file(){ return lang()==='es'?'Este navegador (en este dispositivo)':'This browser (on this device)'; },
  backups(){ return t('bkBrowserWhere'); }
};

/* ======================================================================================
   backend: a folder on this computer
   ====================================================================================== */
const folder={
  kind:'folder', dir:null, mod:null,
  async perm(h,ask){ if(!h) return 'denied'; if(typeof h.queryPermission!=='function') return 'granted';
    let p=await h.queryPermission({mode:'readwrite'}); if(p==='granted'||!ask) return p;
    try{ p=await h.requestPermission({mode:'readwrite'}); }catch(_){ p='denied'; } return p; },
  async has(dir,name){ try{ await dir.getFileHandle(name); return true; }catch(_){ return false; } },
  /* the picked folder, or the tracker folder inside it (made if needed) */
  async resolve(h){
    if(h.name===FOLDER||await this.has(h,FILE)) return h;
    try{ return await h.getDirectoryHandle(FOLDER); }catch(_){}
    return await h.getDirectoryHandle(FOLDER,{create:true});
  },
  async pick(){
    let h; try{ h=await window.showDirectoryPicker({id:'ybt-data',mode:'readwrite',startIn:'documents'}); }
    catch(e){ if(e&&e.name==='AbortError') return null; throw e; }
    if(await this.perm(h,true)!=='granted') throw new Error('denied');
    return await this.resolve(h);
  },
  async readAt(dir){ try{ const f=await (await dir.getFileHandle(FILE)).getFile(); return {text:await f.text(),mod:f.lastModified}; }catch(e){ if(e&&e.name==='NotFoundError') return null; throw e; } },
  async read(){ const r=await this.readAt(this.dir); this.mod=r?r.mod:null; return r?r.text:null; },
  async writeAt(dir,text){ const fh=await dir.getFileHandle(FILE,{create:true}); const w=await fh.createWritable(); try{ await w.write(text); await w.close(); }catch(e){ try{ await w.abort(); }catch(_){} throw e; } return (await fh.getFile()).lastModified; },
  /* someone else (the Windows app, another tab) wrote the file since this page read or wrote it */
  async changedElsewhere(){ if(this.mod==null) return null; const r=await this.readAt(this.dir); if(!r) return null; return r.mod!==this.mod?r:null; },
  async write(text){ await this.backup(); this.mod=await this.writeAt(this.dir,text); lastSaved=new Date(); },
  async backupsDir(dir){ return (dir||this.dir).getDirectoryHandle(BACKUPS,{create:true}); },
  async backup(){ const d=today(); if(this._bk===d) return;
    try{ const r=await this.readAt(this.dir); if(!r){ this._bk=d; return; }
      const b=await this.backupsDir(), name='tracker-data '+d+'.json';
      if(!(await this.has(b,name))){ const w=await (await b.getFileHandle(name,{create:true})).createWritable(); await w.write(r.text); await w.close(); }
      this._bk=d;
      const names=[]; for await (const [n,h] of b.entries()) if(h.kind==='file'&&DAILY.test(n)) names.push(n);
      names.sort(); for(const n of names.slice(0,Math.max(0,names.length-KEEP))){ try{ await b.removeEntry(n); }catch(_){} }
    }catch(_){ /* a missed backup never blocks saving */ } },
  async keepCopy(text,label,dir){ const b=await this.backupsDir(dir); const w=await (await b.getFileHandle('tracker-data '+label+' '+stamp()+'.json',{create:true})).createWritable(); await w.write(text); await w.close(); },
  file(){ return (this.dir?this.dir.name:FOLDER)+' / '+FILE; },
  backups(){ return (this.dir?this.dir.name:FOLDER)+' / '+BACKUPS; }
};

/* ======================================================================================
   backend: Google Drive (drive.file), with the copy on this device as the working copy
   ====================================================================================== */
const drive={
  kind:'drive', token:null, exp:0, client:null, meta:null, /* {fileId, folderId, backupsId, version} */
  dirty:false, lastSync:null, state:'idle', /* idle | saving | offline | signin | error */
  async loadGis(){
    if(window.google&&window.google.accounts&&window.google.accounts.oauth2) return;
    await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://accounts.google.com/gsi/client'; s.async=true; s.onload=res; s.onerror=()=>rej(new Error('gis')); document.head.appendChild(s); });
  },
  valid(){ return this.token&&Date.now()<this.exp-60000; },
  /* Google's pass lasts an hour. It is kept on this device until then, so a reload, another tab or a trip to the
     landing page doesn't ask again. It only opens files MyAhorros made (drive.file). */
  keep(){ lsSet(TOKEN_KEY,this.token?JSON.stringify({t:this.token,e:this.exp}):null); },
  restore(){ try{ const x=JSON.parse(lsGet(TOKEN_KEY)||'null'); if(x&&x.t&&+x.e>Date.now()+60000){ this.token=x.t; this.exp=+x.e; } }catch(_){} },
  /* the Google account, so the next pass is asked for that account without a chooser */
  async learnHint(){ try{ const m=Object.assign({},JSON.parse(lsGet(DRIVE_KEY)||'{}')); if(m.hint) return;
    const r=await this.json('GET',`${API}/about?fields=user(emailAddress)`), e=r&&r.user&&r.user.emailAddress; if(!e) return;
    m.hint=e; if(this.meta) this.meta.hint=e; lsSet(DRIVE_KEY,JSON.stringify(m)); }catch(_){} },
  /* must run from a click: Google's window is a pop-up */
  async signIn(){
    await this.loadGis();
    const o=window.google.accounts.oauth2;
    return new Promise((res,rej)=>{
      const hint=(JSON.parse(lsGet(DRIVE_KEY)||'{}')||{}).hint;
      const c=o.initTokenClient({client_id:CFG.googleClientId,scope:DRIVE_SCOPE,prompt:'',login_hint:hint||undefined,
        callback:r=>{ if(r&&r.access_token&&(!o.hasGrantedAllScopes||o.hasGrantedAllScopes(r,DRIVE_SCOPE))){ this.token=r.access_token; this.exp=Date.now()+(+r.expires_in||3600)*1000; this.keep(); this.learnHint(); res(true); setTimeout(()=>window.dispatchEvent(new CustomEvent('ybt-local-render')),0); } else rej(new Error('denied')); },
        error_callback:e=>rej(new Error(e&&e.type==='popup_closed'?'denied':'gis'))});
      c.requestAccessToken();
    });
  },
  async api(method,url,body,headers){
    if(!this.valid()) throw new Error('signin');
    /* reads and updates are tried up to 3 times when Google is busy or the connection blips; creating a file is not
       repeated here (the next sync finds out whether it was made, so there are never two) */
    const tries=method==='POST'?1:3; let r;
    for(let i=1;;i++){
      try{ r=await fetch(url,{method,body,headers:Object.assign({Authorization:'Bearer '+this.token},headers||{})}); }
      catch(_){ if(navigator.onLine===false) throw new Error('offline'); if(i<tries){ await sleep(600*Math.pow(2,i)); continue; } throw new Error('network'); }
      if((r.status===429||r.status>=500)&&i<tries){ await sleep(Math.min(8000,Math.max((+r.headers.get('Retry-After')||0)*1000,600*Math.pow(2,i)))); continue; }
      break;
    }
    if(r.status===401||r.status===403&&/auth/i.test(await r.clone().text())){ this.token=null; this.keep(); throw new Error('signin'); }
    if(!r.ok) throw new Error('drive '+r.status);
    return r;
  },
  async json(method,url,body){ return (await this.api(method,url,body?JSON.stringify(body):undefined,body?{'Content-Type':'application/json'}:undefined)).json(); },
  q(s){ return encodeURIComponent(s); },
  async findFolder(name,parent){
    const q=`name='${name.replace(/'/g,"\\'")}' and mimeType='application/vnd.google-apps.folder' and trashed=false`+(parent?` and '${parent}' in parents`:'');
    const r=await this.json('GET',`${API}/files?q=${this.q(q)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&spaces=drive`);
    return r.files&&r.files[0]?r.files[0].id:null;
  },
  async ensureFolder(name,parent){ const id=await this.findFolder(name,parent); if(id) return id;
    return (await this.json('POST',`${API}/files?fields=id`,Object.assign({name,mimeType:'application/vnd.google-apps.folder'},parent?{parents:[parent]}:{}))).id; },
  async findFile(folderId){
    const q=`name='${FILE}' and '${folderId}' in parents and trashed=false`;
    const r=await this.json('GET',`${API}/files?q=${this.q(q)}&fields=files(id,version,modifiedTime)&orderBy=modifiedTime desc&spaces=drive`);
    return r.files&&r.files[0]||null;
  },
  async locate(){   /* folder and file ids, made if needed (the file only when there's something to write) */
    const m=Object.assign({},JSON.parse(lsGet(DRIVE_KEY)||'{}'));
    if(m.fileId){ try{ const f=await this.json('GET',`${API}/files/${m.fileId}?fields=id,version,modifiedTime,trashed`); if(!f.trashed){ this.meta=Object.assign(m,{remote:f}); return this.meta; } }catch(e){ if(/signin|offline|network/.test(e.message)) throw e; } }
    m.folderId=await this.ensureFolder(FOLDER,null);
    const f=await this.findFile(m.folderId);
    m.fileId=f?f.id:null; m.remote=f||null; this.meta=m; this.remember(); return m;
  },
  remember(){ const m=this.meta||{}, was=JSON.parse(lsGet(DRIVE_KEY)||'{}')||{}; lsSet(DRIVE_KEY,JSON.stringify({fileId:m.fileId||null,folderId:m.folderId||null,backupsId:m.backupsId||null,hint:m.hint||was.hint||null})); },
  async remote(){ const m=this.meta; if(!m||!m.fileId) return null;
    const f=await this.json('GET',`${API}/files/${m.fileId}?fields=id,version,modifiedTime`);
    return f; },
  async download(id){ return (await this.api('GET',`${API}/files/${id}?alt=media`)).text(); },
  async upload(text){
    const m=this.meta;
    if(!m.fileId){
      const ex=await this.findFile(m.folderId); if(ex){ m.fileId=ex.id; this.remember(); throw new Error('exists'); }   /* another device made it first: sync again so nothing is overwritten */
      const bd='ybt'+Math.random().toString(36).slice(2);
      const body=`--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:FILE,parents:[m.folderId],mimeType:'application/json'})}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${bd}--`;
      const f=await (await this.api('POST',`${UPLOAD}/files?uploadType=multipart&fields=id,version,modifiedTime`,body,{'Content-Type':'multipart/related; boundary='+bd})).json();
      m.fileId=f.id; this.remember(); return f;
    }
    return (await this.api('PATCH',`${UPLOAD}/files/${m.fileId}?uploadType=media&fields=id,version,modifiedTime`,text,{'Content-Type':'application/json'})).json();
  },
  async backup(){ const d=today(), m=this.meta; if(this._bk===d||!m||!m.fileId) return;
    try{
      if(!m.backupsId){ m.backupsId=await this.ensureFolder(BACKUPS,m.folderId); this.remember(); }
      const name='tracker-data '+d+'.json', q=`name='${name}' and '${m.backupsId}' in parents and trashed=false`;
      const ex=await this.json('GET',`${API}/files?q=${this.q(q)}&fields=files(id)&spaces=drive`);
      if(!(ex.files&&ex.files.length)) await this.json('POST',`${API}/files/${m.fileId}/copy?fields=id`,{name,parents:[m.backupsId]});
      this._bk=d;
      const all=await this.json('GET',`${API}/files?q=${this.q(`'${m.backupsId}' in parents and trashed=false`)}&fields=files(id,name)&pageSize=200&spaces=drive`);
      const daily=(all.files||[]).filter(f=>DAILY.test(f.name)).sort((a,b)=>a.name<b.name?-1:1);
      for(const f of daily.slice(0,Math.max(0,daily.length-KEEP))){ try{ await this.api('DELETE',`${API}/files/${f.id}`); }catch(_){} }
    }catch(e){ if(/signin|offline|network/.test(e.message)) throw e; }
  },
  async keepCopy(text,label){ const m=this.meta; if(!m) return;
    if(!m.backupsId){ m.backupsId=await this.ensureFolder(BACKUPS,m.folderId); this.remember(); }
    const bd='ybt'+Math.random().toString(36).slice(2);
    const body=`--${bd}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:'tracker-data '+label+' '+stamp()+'.json',parents:[m.backupsId],mimeType:'application/json'})}\r\n--${bd}\r\nContent-Type: application/json\r\n\r\n${text}\r\n--${bd}--`;
    await this.api('POST',`${UPLOAD}/files?uploadType=multipart&fields=id`,body,{'Content-Type':'multipart/related; boundary='+bd});
  },
  /* the copy on this device: {text, version (of the Drive file it came from), dirty} */
  async cache(){ return await idb.get('drive'); },
  async keepLocal(text,dirty){ const c=(await this.cache())||{}; await idb.set('drive',{text,version:c.version==null?null:c.version,dirty:!!dirty}); askPersist(); },
  async markSynced(text,version){ await idb.set('drive',{text,version,dirty:false}); },
  file(){ return 'Google Drive / '+FOLDER+' / '+FILE; },
  backups(){ return 'Google Drive / '+FOLDER+' / '+BACKUPS; }
};

/* ---------- current backend ---------- */
let mode=null, B=null, lastSaved=null;
const BACKENDS={browser,folder,drive};
function setMode(m){ mode=m; B=BACKENDS[m]; lsSet(MODE_KEY,m); }

/* ---------- panels (choice, permission, conflicts) ---------- */
function panel(html,opts){
  const el=document.createElement('div'); el.className='web-panel'; el.setAttribute('role','dialog'); el.setAttribute('aria-modal','true'); el.setAttribute('aria-labelledby','wp-title');
  if(opts&&opts.overlay) el.classList.add('overlay');
  el.innerHTML=`<div class="web-panel-card">${html}<p class="web-msg" role="status" hidden></p></div>`;
  document.body.appendChild(el);
  const first=el.querySelector('[autofocus]')||el.querySelector('button:not([disabled])'); if(first) setTimeout(()=>first.focus(),0);
  /* Tab stays inside the panel, like the app's own dialogs */
  el.addEventListener('keydown',e=>{ if(e.key!=='Tab') return;
    const f=[...el.querySelectorAll('a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])')].filter(x=>x.getClientRects().length), i=f.indexOf(document.activeElement);
    if(!f.length) return;
    if(e.shiftKey&&i<=0){ e.preventDefault(); f[f.length-1].focus(); } else if(!e.shiftKey&&i===f.length-1){ e.preventDefault(); f[0].focus(); } });
  el.msg=s=>{ const m=el.querySelector('.web-msg'); m.textContent=s||''; m.hidden=!s; };
  el.busy=on=>el.querySelectorAll('button').forEach(b=>{ if(on){ b.dataset.was=b.disabled?'1':''; b.disabled=true; } else b.disabled=b.dataset.was==='1'; });
  return el;
}
const ICONS={
  folder:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M3 6.5A1.5 1.5 0 0 1 4.5 5H9l2 2.5h8.5A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z"/></svg>',
  drive:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M8.5 3.5h7l6 10.5-3.5 6H6L2.5 14z"/><path d="M8.5 3.5 15 14.5H2.5M15.5 3.5 9 14.5l-3 5.5M21.5 14H9"/></svg>',
  browser:'<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4.5" width="18" height="15" rx="2"/><path d="M3 9h18"/></svg>'
};
/* the page every typed visit starts on: what the tracker is, then "See a demo" or "Get started",
   or only "Open my tracker" when this browser already has one. Resolves 'demo' | 'start' | 'open'. */
function landing(known){
  return new Promise(resolve=>{
    const el=document.createElement('div'); el.className='web-landing'; el.setAttribute('role','dialog'); el.setAttribute('aria-label','MyAhorros');
    const draw=()=>{
      const L0=lang(), F=t('landF'), H=t('landHowSteps'); document.documentElement.lang=L0;
      const cta=known?`<button type="button" class="btn primary" data-x="open">${esc(t('landOpen'))}</button>`:`<button type="button" class="btn" data-x="demo">${esc(t('landDemo'))}</button><button type="button" class="btn primary" data-x="start">${esc(t('landStart'))}</button>`;
      const ico=['<path d="M4 16.5V10M10 16.5V4M16 16.5V8"/>','<path d="M10 3.5l7 3.4-7 3.4-7-3.4z"/><path d="M3 10.4l7 3.4 7-3.4"/><path d="M3 13.9l7 3.4 7-3.4"/>','<path d="M3 14.5l4.5-4.5 3 3L17 6.5"/><path d="M12.5 6.5H17V11"/>','<path d="M3 15.5l3.5-3.5 3 2 2.5-3"/><path d="M14 9.5l3.5-3.5" stroke-dasharray="1.2 2.6"/><path d="M3 18h14"/>'],
        shield='<path d="M10 2.5l6 2.5v4.5c0 4-2.6 6.8-6 8-3.4-1.2-6-4-6-8V5z"/><path d="M7.5 10l2 2 3.5-4"/>', svg=(d,n)=>`<svg viewBox="0 0 20 20" width="${n}" height="${n}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
      /* the product shots (made by tools/landing-shot.js from made-up data) in the tracker's light or dark look */
      const th=document.documentElement.getAttribute('data-ybt-theme'), dark=th?th==='dark':!!(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches), shot=n=>`images/landing-${n}-${dark?'dark':'light'}${L0==='es'?'-es':''}.webp`;   /* the shots are in the landing page's language */
      const callIco=[shield,'<rect x="3" y="3.5" width="14" height="13" rx="2"/><path d="M3 8h14M8 8v8.5"/>','<path d="M10 3l1.6 4.4L16 9l-4.4 1.6L10 15l-1.6-4.4L4 9l4.4-1.6z"/>'];
      el.innerHTML=`<header class="wl-top"><span class="wl-brand">MyAhorros</span>
          <div class="wl-top-r"><div class="web-lang" role="group" aria-label="Language / Idioma"><button type="button" data-lang="en" aria-pressed="${L0==='en'}">English</button><button type="button" data-lang="es" aria-pressed="${L0==='es'}">Español</button></div>
          ${cta}</div></header>
        <main>
          <section class="wl-hero"><div class="wl-stage"><div class="wl-hero-text"><p class="wl-chip">${esc(t('landChip'))}</p><h1>${esc(t('landH1'))}</h1><p class="wl-lead">${esc(t('landSub'))}</p>
            <div class="wl-cta">${cta}</div>
            <p class="wl-fine">${esc(t('landNoSignup'))}</p></div>
            <figure class="wl-frame"><div class="wl-glow" aria-hidden="true"></div><div class="wl-view"><div class="wl-pages">
              <img src="${shot('networth')}" alt="${esc(t('landShotAlt'))}" width="1280" height="899" fetchpriority="high" decoding="async">
              <img src="${shot('overview')}" alt="" width="1280" height="1088" loading="lazy" decoding="async">
              <img src="${shot('yearly')}" alt="" width="1280" height="900" loading="lazy" decoding="async"></div></div></figure>
            <ul class="wl-calls">${t('landCalls').map((c,i)=>`<li class="wl-call c${i+1}"><span class="wl-ico">${svg(callIco[i],20)}</span>${esc(c)}</li>`).join('')}</ul></div></section>
          <div class="wl-body">
          <section class="wl-feats wl-reveal"><h2>${esc(t('landFeatT'))}</h2><p class="wl-sub">${esc(t('landFeatSub'))}</p>
            <div class="wl-grid">${F.map((f,i)=>`<article class="wl-card"><span class="wl-ico">${svg(ico[i],22)}</span><h3>${esc(f[0])}</h3><p>${esc(f[1])}</p></article>`).join('')}</div></section>
          <section class="wl-safe wl-reveal"><span class="wl-ico big">${svg(shield,30)}</span><div><h2>${esc(t('landSafeT'))}</h2><p>${esc(t('landSafe'))}</p></div></section>
          <section class="wl-how wl-reveal"><h2>${esc(t('landHow'))}</h2><ol>${H.map((h,i)=>`<li><b>${esc(h[0])}</b><span>${esc(h[1])}</span></li>`).join('')}</ol></section>
          <section class="wl-end wl-reveal"><h2>${esc(t('landEnd'))}</h2><p>${esc(t('landEndSub'))}</p>
            <div class="wl-cta">${cta}</div></section>
          </div>
        </main>
        <footer class="wl-foot"><span class="wl-brand">MyAhorros</span><a href="privacy.html">${esc(t('landPrivacy'))}</a><span>© ${new Date().getFullYear()}</span></footer>`;
      /* sections fade in as they scroll into view (not for people who asked for less motion) */
      const secs=[...el.querySelectorAll('.wl-reveal')];
      if(!('IntersectionObserver' in window)||(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)){ secs.forEach(x=>x.classList.add('in')); return; }
      const io=new IntersectionObserver(es=>es.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('in'); io.unobserve(e.target); } }),{root:el,threshold:.15});
      secs.forEach(x=>io.observe(x));
    };
    /* the hero's scroll progress --wl-p (0-1, read by web.css): CSS drives it where scroll-driven animations exist,
       this sets it elsewhere. Phones and reduced motion get a still picture, so nothing runs there. */
    const motion=window.matchMedia&&matchMedia('(min-width:768px) and (prefers-reduced-motion:no-preference)'), cssDriven=!!(window.CSS&&CSS.supports&&CSS.supports('animation-timeline','view()'));
    const prog=()=>{ const h=el.querySelector('.wl-hero'); if(!h||cssDriven||!motion||!motion.matches) return;
      const r=h.getBoundingClientRect(), d=r.height-el.clientHeight; h.style.setProperty('--wl-p',d>0?Math.min(1,Math.max(0,-r.top/d)).toFixed(4):'0'); };
    let raf=0;
    el.addEventListener('scroll',()=>{ if(raf) return; raf=requestAnimationFrame(()=>{ raf=0;
      /* the later pages inside the frame load once scrolling starts (clipped by the frame, lazy loading alone would wait until they show) */
      if(motion&&motion.matches) el.querySelectorAll('.wl-pages img[loading=lazy]').forEach(i=>{ i.loading='eager'; });
      prog(); }); },{passive:true});
    /* the hero's buttons fade out as the preview covers them: tabbing back to them scrolls back up */
    el.addEventListener('focusin',e=>{ if(motion&&motion.matches&&e.target.closest('.wl-hero-text')&&el.scrollTop>0) el.scrollTop=0; });
    draw(); document.body.appendChild(el); document.body.classList.add('web-landing-on'); prog();
    el.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return;
      if(b.dataset.lang){ const v=b.dataset.lang; seeLang(v); lsSet('ybt.lang',v); document.title=v==='es'?'MyAhorros':'MyAhorros'; window.dispatchEvent(new CustomEvent('ybt-lang',{detail:v})); const y=el.scrollTop; draw(); el.scrollTop=y; prog(); return; }
      if(!b.dataset.x) return; el.remove(); document.body.classList.remove('web-landing-on'); resolve(b.dataset.x); });
  });
}
/* the three choices; resolves with the mode picked, or null (cancelled from Settings) */
function chooseMode(fromSettings,opts){   /* opts.keep: label for the button that keeps things as they are (default Cancel) */
  return new Promise(resolve=>{
    const fOk=canFolder(), dOk=canDrive()&&navigator.onLine!==false;
    const card=(m,title,sub,ok,why,rec)=>`<button type="button" class="web-way${mode===m&&fromSettings?' current':''}" data-m="${m}"${ok?'':' disabled'}>${ICONS[m]}<span><b>${esc(title)}${rec&&ok?` <i class="web-rec">${esc(t('recommended'))}</i>`:''}</b><small>${esc(sub)}</small>${ok?'':`<small class="web-why">${esc(why)}</small>`}</span></button>`;
    const L0=lang(), langSw=fromSettings?'':`<div class="web-lang" role="group" aria-label="Language / Idioma"><button type="button" data-lang="en" aria-pressed="${L0==='en'}">English</button><button type="button" data-lang="es" aria-pressed="${L0==='es'}">Español</button></div>`;
    const el=panel(`<div class="web-top"><p class="web-eyebrow">MyAhorros</p>${langSw}</div><h2 id="wp-title">${esc(t('chooseTitle'))}</h2><p class="web-sub">${esc(t('chooseSub'))}</p>
      <div class="web-ways">
        ${card('folder',t('folderT'),t('folderS'),fOk,t('folderNo'),true)}
        ${card('drive',t('driveT'),t('driveS')+(fromSettings?'':' '+t('driveHave')),dOk,canDrive()?t('driveOffline'):t('driveNo'),!fOk)}
        ${card('browser',t('browserT'),t('browserS')+(itp()?' '+t('itpWarn'):''),true,'',false)}
      </div>
      ${fOk?`<p class="web-hint">${esc(t('pickHint'))}</p>`:''}
      ${fromSettings?'':`<div class="web-acts"><button type="button" class="btn ghost" data-x="example">${esc(t('exampleBtn'))}</button></div>`}
      ${fromSettings?'':`<p class="web-hint web-about">${esc(t('about'))} <a href="privacy.html">${esc(t('privacyLink'))}</a></p>`}
      ${fromSettings?`<div class="web-acts"><button type="button" class="btn ghost" data-x="cancel">${esc(opts&&opts.keep||t('cancel'))}</button></div>`:''}`,{overlay:fromSettings});
    el.addEventListener('click',async e=>{
      const b=e.target.closest('button'); if(!b||b.disabled) return;
      if(b.dataset.lang){ const v=b.dataset.lang; seeLang(v); lsSet('ybt.lang',v); document.title=v==='es'?'MyAhorros':'MyAhorros'; window.dispatchEvent(new CustomEvent('ybt-lang',{detail:v})); el.remove(); chooseMode(fromSettings,opts).then(resolve); return; }
      if(b.dataset.x==='cancel'){ el.remove(); resolve(null); return; }
      if(b.dataset.x==='example'){ try{ sessionStorage.setItem('ybt.autotour','1'); }catch(_){} el.remove(); resolve({mode:'browser'}); return; }
      const m=b.dataset.m; if(!m) return;
      el.busy(true); el.msg('');
      try{
        if(m==='folder'){ const dir=await folder.pick(); if(!dir){ el.busy(false); return; } el.remove(); resolve({mode:'folder',dir}); return; }
        if(m==='drive'){ b.querySelector('b').firstChild.textContent=t('connecting')+' '; await drive.signIn(); await drive.locate(); el.remove(); resolve({mode:'drive'}); return; }
        el.remove(); resolve({mode:'browser'});
      }catch(err){
        el.busy(false);
        if(m==='drive'){ b.querySelector('b').firstChild.textContent=t('driveT')+' '; el.msg(err&&err.message==='denied'?t('driveDenied'):t('driveFail')); }
        else el.msg(t('pickedNotAllowed'));
      }
    });
  });
}
/* two versions of the data: returns 'theirs' or 'mine' */
function askConflict(kind,theirs,when){
  return new Promise(resolve=>{
    const el=panel(`<h2 id="wp-title">${esc(t('conflictTitle'))}</h2>
      <p class="web-sub">${esc(kind==='drive'?t('conflictDrive',when?hhmm(when):'',fmtN(countTx(theirs))):t('conflictFolder',when?hhmm(when):'',fmtN(countTx(theirs))))}</p>
      <p class="web-sub">${esc(t('conflictMine',fmtN(countTx(store))))}</p>
      <div class="web-acts"><button type="button" class="btn primary" data-x="theirs">${esc(t('useTheirs'))}</button><button type="button" class="btn" data-x="mine">${esc(t('useMine'))}</button><button type="button" class="btn" data-x="merge">${esc(t('useMerge'))}</button></div>
      <p class="web-hint">${esc(t('conflictNote'))}</p>`,{overlay:true});
    el.addEventListener('click',e=>{ const b=e.target.closest('button[data-x]'); if(!b) return; el.remove(); resolve(b.dataset.x); });
  });
}
/* every month and setting from both; where both have the same one, the version on this screen wins
   (ponytail: whole months, not single transactions. The other side is kept as a backup before this runs.) */
/* "Merge both": everything from both versions. Rows, accounts and the like are matched by id (otherwise by value);
   where both have the same one, or the same setting, this screen's version wins. Deleted on one side comes back. */
function mergeVal(mine,theirs){
  if(mine===undefined) return clone(theirs);
  if(Array.isArray(mine)&&Array.isArray(theirs)){
    const key=x=>x&&typeof x==='object'&&x.id!=null?'id:'+x.id:'v:'+JSON.stringify(x);
    const m=new Map(mine.map(x=>[key(x),x])), seen=new Set(theirs.map(key));
    return theirs.map(x=>m.has(key(x))?mergeVal(m.get(key(x)),x):clone(x)).concat(clone(mine.filter(x=>!seen.has(key(x)))));
  }
  const obj=x=>x&&typeof x==='object'&&!Array.isArray(x);
  if(obj(mine)&&obj(theirs)){ const out={}; for(const k of new Set([...Object.keys(theirs),...Object.keys(mine)])) out[k]=mergeVal(mine[k],theirs[k]); return out; }
  return clone(mine);
}
function mergeData(mine,theirs){
  return mergeVal({months:(mine&&mine.months)||{},config:(mine&&mine.config)||{}},{months:(theirs&&theirs.months)||{},config:(theirs&&theirs.config)||{}});
}
/* the place picked already has a tracker: 'there' or 'replace' */
function askExisting(there){
  return new Promise(resolve=>{
    const el=panel(`<h2 id="wp-title">${esc(t('existsTitle'))}</h2><p class="web-sub">${esc(t('existsText',fmtN(countTx(there)),fmtN(countTx(store))))}</p>
      <div class="web-acts"><button type="button" class="btn primary" data-x="there">${esc(t('useThere'))}</button><button type="button" class="btn" data-x="replace">${esc(t('replaceThere'))}</button><button type="button" class="btn ghost" data-x="cancel">${esc(t('cancel'))}</button></div>
      <p class="web-hint">${esc(t('replaceNote'))}</p>`,{overlay:true});
    el.addEventListener('click',e=>{ const b=e.target.closest('button[data-x]'); if(!b) return; el.remove(); resolve(b.dataset.x==='cancel'?null:b.dataset.x); });
  });
}
function askConfirm(title,text,yes){
  return new Promise(resolve=>{
    const el=panel(`<h2 id="wp-title">${esc(title)}</h2><p class="web-sub">${esc(text)}</p>
      <div class="web-acts"><button type="button" class="btn danger" data-x="yes">${esc(yes)}</button><button type="button" class="btn" data-x="no" autofocus>${esc(t('cancel'))}</button></div>`,{overlay:true});
    el.addEventListener('click',e=>{ const b=e.target.closest('button[data-x]'); if(!b) return; el.remove(); resolve(b.dataset.x==='yes'); });
    /* Escape cancels; it stops here so the dialog underneath stays open */
    el.addEventListener('keydown',e=>{ if(e.key!=='Escape') return; e.stopPropagation(); el.remove(); resolve(false); });
  });
}

/* ---------- the strip at the bottom when Drive or the folder needs a click ---------- */
let barKind=null;
function bar(kind){
  barKind=kind; let el=document.getElementById('web-bar');
  if(!kind){ if(el) el.remove(); notify(); return; }
  if(!el){ el=document.createElement('div'); el.id='web-bar'; el.setAttribute('role','status'); document.body.appendChild(el);
    el.addEventListener('click',async e=>{ const b=e.target.closest('button'); if(!b) return; b.disabled=true;
      try{ if(barKind==='signin'||barKind==='start'){ await drive.signIn(); bar(null); await driveSync('note'); }
        else if(barKind==='folder'||barKind==='folderfail'){ if(await folder.perm(folder.dir,true)==='granted'){ bar(null); await flushFolder(); } } }
      catch(_){ } finally{ b.disabled=false; } }); }
  const txt={start:t('barStart'),signin:t('barSignIn'),offline:t('barOffline'),folder:t('barFolder'),folderfail:t('barFolderFail')}[kind];
  const btn={start:t('connect'),signin:t('reconnect'),folder:t('allowShort'),folderfail:t('allowShort')}[kind];
  el.className='web-bar '+kind;
  el.innerHTML=`<span>${esc(txt)}</span>${btn?`<button type="button" class="btn sm">${esc(btn)}</button>`:''}`;
  notify();
}
/* the page redraws its Settings line */
let notifyT=0;
function notify(){ clearTimeout(notifyT); notifyT=setTimeout(()=>{ const s=document.getElementById('local-status'); if(s){ const v=local.status; s.textContent=v||''; s.hidden=!v; }
  /* a small always-visible sync line while Google Drive is the storage */
  let p=document.getElementById('web-sync');
  if(mode!=='drive'){ if(p) p.remove(); return; }
  if(!p){ p=document.createElement('div'); p.id='web-sync'; p.setAttribute('role','status'); document.body.appendChild(p); }
  p.className='web-sync '+(drive.state==='error'?'bad':drive.state==='saving'||drive.dirty?'busy':'ok'); p.textContent=local.status||''; p.hidden=!p.textContent;
},30); }
function note(s){ window.dispatchEvent(new CustomEvent('ybt-local-note',{detail:s})); }
window.addEventListener('ybt-local-note',e=>{ const host=document.getElementById('toast'); if(!host||!e.detail) return;
  const d=document.createElement('div'); d.className='toast'; d.innerHTML='<span>'+esc(e.detail)+'</span>'; host.appendChild(d); setTimeout(()=>d.remove(),8000); });

/* ---------- saving ---------- */
let saving=null, asleep=false;   /* asleep: another tab took over (see "one tab at a time") */
function save(){
  if(asleep) return Promise.resolve();
  if(saving) return saving;
  const p=enqueue(async()=>{
    saving=null;
    const text=serialise();
    if(mode==='browser'){ try{ await browser.write(text); }catch(_){ throw {code:'unavailable',message:'not saved'}; } return; }
    if(mode==='folder'){ await idb.set('folder-pending',text).catch(()=>{}); await idb.set('folder-pending-mod',folder.mod==null?null:folder.mod).catch(()=>{}); await flushFolder(); return; }
    if(mode==='drive'){ try{ await drive.keepLocal(text,true); }catch(_){ throw {code:'unavailable',message:'not saved'}; } drive.dirty=true; scheduleUpload(); notify(); }
  });
  saving=p; return p;
}
/* the folder: write the newest data, or keep it in the browser until the folder works again */
/* the page is in the middle of something (a dialog is open, edits are still on their way here):
   never swap its data or put a question over it. The data waits in the browser and is tried again. */
let busyT=0;
const pageBusy=()=>{ try{ return typeof window.YBT_BUSY==='function'&&!!window.YBT_BUSY(); }catch(_){ return false; } };
function deferIfBusy(fn){ if(!pageBusy()) return false; clearTimeout(busyT); busyT=setTimeout(fn,4000); return true; }
async function flushFolder(){
  if(asleep) return;
  if(deferIfBusy(()=>flushFolder().catch(()=>{}))) return;
  let text=await idb.get('folder-pending').catch(()=>null); if(typeof text!=='string') return;
  try{
    if(await folder.perm(folder.dir,false)!=='granted'){ bar('folder'); return; }
    const other=await folder.changedElsewhere();
    if(other){ const theirs=parseData(other.text);
      if(theirs){ const pick=await askConflict('folder',theirs,new Date(other.mod));
        if(pick==='theirs'){ try{ await folder.keepCopy(text,'from this screen'); }catch(_){} folder.mod=other.mod; store=theirs; await idb.del('folder-pending'); window.dispatchEvent(new CustomEvent('ybt-sync-data',{detail:clone(theirs)})); note(t('keptTheirs')); return; }
        try{ await folder.keepCopy(other.text,'changed elsewhere'); }catch(_){}
        if(pick==='merge'){ const mine=parseData(text); if(mine){ store=mergeData(mine,theirs); text=serialise(); await idb.set('folder-pending',text); window.dispatchEvent(new CustomEvent('ybt-sync-data',{detail:clone(store)})); note(t('mergedBoth')); } }
        else note(t('keptMine')); } }
    await folder.write(text);
    if(await idb.get('folder-pending')===text) await idb.del('folder-pending');
    if(barKind) bar(null); notify();
  }catch(e){ bar('folderfail'); }
}
/* Drive: upload a moment after the last change */
let upT=0;
function scheduleUpload(ms){ clearTimeout(upT); upT=setTimeout(()=>{ driveSync(false).catch(()=>{}); },ms==null?1500:ms); }
let syncing=null;
function driveSync(pull){
  if(asleep) return Promise.resolve();
  if(syncing) return syncing.then(()=>pull||drive.dirty?driveSync(pull):null);
  if(deferIfBusy(()=>driveSync(pull).catch(()=>{}))){ drive.state='paused'; notify(); return Promise.resolve(); }
  syncing=(async()=>{
    try{
      if(navigator.onLine===false){ drive.state='offline'; bar('offline'); return; }
      if(!drive.valid()){ drive.state='signin'; bar(drive.token?'signin':'start'); return; }
      if(!drive.meta) await drive.locate();
      const c=(await drive.cache())||{};
      const r=drive.meta.fileId?await drive.remote():null;
      /* the Drive file is newer than the copy here, or this device never synced with it */
      const newer=!!r&&(c.version==null||+r.version>+c.version);
      if(newer){
        const text=await drive.download(r.id), theirs=parseData(text);
        /* the page may have started something while that downloaded: leave its data alone and look again soon */
        if(pageBusy()){ deferIfBusy(()=>driveSync(pull).catch(()=>{})); drive.state='paused'; return; }
        /* Drive's copy can't be read (damaged, cut short): keep it as a backup, then ours goes up over it below.
           (Before, the newer version kept winning the check before uploading and this went round every 300 ms.) */
        if(!theirs){ await drive.keepCopy(text,'unreadable'); const cu=(await drive.cache())||c; await idb.set('drive',{text:cu.text||serialise(),version:r.version,dirty:true}); drive.dirty=true; }
        /* edits made while it downloaded count as ours: look again, right before deciding */
        const cl=(await drive.cache())||c, unsaved=!!saving||drive.dirty;
        const mineText=unsaved?serialise():cl.text, mine=mineText?parseData(mineText):null;
        if(theirs&&(cl.dirty||unsaved)&&mine&&!isEmpty(mine)){
          const pick=await askConflict('drive',theirs,r.modifiedTime?new Date(r.modifiedTime):null);
          if(pick==='theirs'){ try{ await drive.keepCopy(mineText,'from this screen'); }catch(_){} store=theirs; await drive.markSynced(text,r.version); drive.dirty=false; window.dispatchEvent(new CustomEvent('ybt-sync-data',{detail:clone(theirs)})); note(t('keptTheirs')); drive.lastSync=new Date(); drive.state='idle'; bar(null); return; }
          try{ await drive.keepCopy(text,'changed elsewhere'); }catch(_){}
          if(pick==='merge'){ store=mergeData(mine,theirs); const mt=serialise(); await idb.set('drive',{text:mt,version:r.version,dirty:true}); drive.dirty=true;
            window.dispatchEvent(new CustomEvent('ybt-sync-data',{detail:clone(store)})); note(t('mergedBoth')); }   /* the merge goes up below */
          else { note(t('keptMine')); await idb.set('drive',{text:mineText,version:r.version,dirty:true}); }   /* ours goes up below */
        } else if(theirs){
          store=theirs; await drive.markSynced(text,r.version);
          window.dispatchEvent(new CustomEvent('ybt-sync-data',{detail:clone(theirs)}));
          if(pull==='note') note(t('pulled'));
          drive.lastSync=new Date(); drive.state='idle'; bar(null); return;
        }
      }
      const c2=(await drive.cache())||{};
      if(c2.dirty||!drive.meta.fileId&&!isEmpty(store)){
        drive.state='saving'; notify();
        /* someone may have saved since we looked: if so, go round again rather than overwrite them */
        if(drive.meta.fileId&&c2.version!=null){ const r2=await drive.remote(); if(r2&&+r2.version>+c2.version){ drive.dirty=true; drive.state='idle'; scheduleUpload(300); return; } }
        await drive.backup();
        const text=c2.text||serialise();
        const f=await drive.upload(text);
        const c3=(await drive.cache())||{};
        await idb.set('drive',{text:c3.text||text,version:f.version,dirty:c3.text!==text});
        drive.dirty=c3.text!==text;
        if(drive.dirty) scheduleUpload(300);
      }
      drive.lastSync=new Date(); drive.state='idle'; drive.fails=0; bar(null);
    }catch(e){
      const m=e&&e.message||'';
      if(m==='exists'){ scheduleUpload(300); }
      else if(m==='signin'){ drive.state='signin'; bar('signin'); }
      else if(m==='offline'||navigator.onLine===false){ drive.state='offline'; bar('offline'); }
      else { /* back off: 30 s, 1 min, 2 min … up to 5 min, and say when the next try is */
        drive.fails=(drive.fails||0)+1; const wait=Math.min(300000,30000*Math.pow(2,drive.fails-1));
        drive.state='error'; drive.nextTry=new Date(Date.now()+wait); scheduleUpload(wait); }
    } finally { notify(); }
  })().finally(()=>{ syncing=null; });
  return syncing;
}
window.addEventListener('online',()=>{ if(mode==='drive'){ if(barKind==='offline') bar(null); driveSync(true); } if(mode==='folder') flushFolder(); });
window.addEventListener('offline',()=>{ if(mode==='drive'){ drive.state='offline'; bar('offline'); } });
/* Google only lets its pop-up open right after a click. So when the pass is gone or has under 10 minutes left, the
   next click anywhere asks for a new one; for someone who already allowed MyAhorros the pop-up closes by itself and
   the "sign in" strip never shows. Not on the strip's own button (it signs in itself); after a failure, wait 10 minutes. */
let renewAt=0;
document.addEventListener('pointerdown',e=>{
  if(mode!=='drive'||navigator.onLine===false||!(window.google&&window.google.accounts&&window.google.accounts.oauth2)) return;
  if(drive.token&&Date.now()<drive.exp-600000||Date.now()<renewAt) return;
  if(e.target&&e.target.closest&&e.target.closest('#web-bar')) return;
  if(!(JSON.parse(lsGet(DRIVE_KEY)||'{}')||{}).folderId) return;   /* never connected on this device: the strip asks */
  renewAt=Date.now()+120000;
  drive.signIn().then(()=>{ if(barKind==='signin'||barKind==='start') bar(null); return driveSync('note'); }).catch(()=>{ renewAt=Date.now()+600000; });
},true);
/* coming back to the tab: catch up with changes made on another device */
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'&&mode==='drive'&&drive.valid()) driveSync('note'); });

/* ---------- swapping the whole dataset (open a file, start fresh, move storage) ---------- */
async function keepCurrent(label){ const text=serialise(); if(isEmpty(store)) return;
  if(mode==='folder') await folder.keepCopy(text,label);
  else if(mode==='drive'){ try{ await drive.keepCopy(text,label); }catch(_){ await browser.keepCopy(text,label); } }
  else await browser.keepCopy(text,label); }
async function replaceAll(d,label){
  try{ await enqueue(()=>keepCurrent(label)); }catch(_){ throw new Error(t('safetyFail')); }
  store=d;
  try{ await save(); }catch(_){ throw new Error(t('writeFail')); }
  window.dispatchEvent(new CustomEvent('ybt-replace-data',{detail:clone(d)}));
}
/* move to another place, carrying the data open now (or picking up the tracker already there) */
async function moveTo(choice){
  const cur=serialise();
  let there=null, thereText=null;
  if(choice.mode==='folder'){ const r=await folder.readAt(choice.dir); if(r){ thereText=r.text; there=parseData(r.text); } }
  if(choice.mode==='drive'&&drive.meta&&drive.meta.fileId){ thereText=await drive.download(drive.meta.fileId); there=parseData(thereText); }
  if(choice.mode==='browser'){ thereText=await browser.read(); there=thereText?parseData(thereText):null; if(there&&mode!=='browser'&&!isEmpty(there)) { /* the browser's own copy is older than what's open: replace it quietly, keeping a copy */ await browser.keepCopy(thereText,'before moving here'); there=null; } }
  let use='replace';
  if(there&&!isEmpty(there)&&!isEmpty(store)&&thereText!==cur){ use=await askExisting(there); if(!use) return null; }
  else if(there&&!isEmpty(there)) use='there';
  await queue;
  const prevMode=mode;
  if(choice.mode==='folder'){ folder.dir=choice.dir; await idb.set('folder',choice.dir); }
  if(prevMode==='drive'&&choice.mode!=='drive'){ try{ if(drive.token&&window.google) window.google.accounts.oauth2.revoke(drive.token,()=>{}); }catch(_){} drive.token=null; drive.keep(); lsSet(DRIVE_KEY,null); await idb.del('drive').catch(()=>{}); }
  setMode(choice.mode); bar(null);
  if(use==='there'){
    store=there;
    if(choice.mode==='folder') folder.mod=(await folder.readAt(folder.dir)||{}).mod||null;
    if(choice.mode==='drive') await drive.markSynced(thereText,(await drive.remote()||{}).version);
    window.dispatchEvent(new CustomEvent('ybt-replace-data',{detail:clone(there)}));
  } else {
    if(there&&!isEmpty(there)){ try{ if(choice.mode==='folder') await folder.keepCopy(thereText,'replaced',choice.dir); else if(choice.mode==='drive') await drive.keepCopy(thereText,'replaced'); }catch(_){} }
    if(choice.mode==='folder') folder.mod=(await folder.readAt(folder.dir)||{}).mod||null;
    if(choice.mode==='drive'){ const r=drive.meta.fileId?await drive.remote():null; await idb.set('drive',{text:cur,version:r?r.version:null,dirty:true}); }
    await save();
    if(choice.mode==='drive') await driveSync(false);
  }
  return t('moved',t(choice.mode==='folder'?'wFolder':choice.mode==='drive'?'wDrive':'wBrowser'));
}

/* ---------- restoring from Google Drive: the tracker file or one of its backups ---------- */
async function driveRestore(){
  if(navigator.onLine===false) return {message:t('driveOffline'),bad:true};
  try{ if(!drive.valid()) await drive.signIn(); await drive.locate(); }
  catch(e){ return {message:e&&e.message==='denied'?t('driveDenied'):t('driveFail'),bad:true}; }
  const m=drive.meta, items=[];
  try{
    if(m.fileId){ const f=await drive.remote(); items.push({id:m.fileId,label:t('restoreMain'),when:f&&f.modifiedTime,main:true}); }
    const bid=m.backupsId||await drive.findFolder(BACKUPS,m.folderId);
    if(bid){ const r=await drive.json('GET',`${API}/files?q=${drive.q(`'${bid}' in parents and trashed=false`)}&fields=files(id,name,modifiedTime)&orderBy=modifiedTime desc&pageSize=60&spaces=drive`);
      for(const f of r.files||[]){ const d=(f.name.match(/(\d{4}-\d{2}-\d{2})/)||[])[1]; items.push({id:f.id,label:d&&DAILY.test(f.name)?t('restoreDaily',dmy(d)):t('restoreOther')+' · '+f.name.replace(/^tracker-data /,'').replace(/\.json$/,''),when:f.modifiedTime}); } }
  }catch(_){ return {message:t('driveFail'),bad:true}; }
  if(!items.length) return {message:t('restoreNone')};
  const fmtW=w=>{ if(!w) return ''; const d=new Date(w); return pad(d.getDate())+'/'+pad(d.getMonth()+1)+'/'+d.getFullYear()+' '+hhmm(d); };
  const pick=await pickRestore(t('restoreTitle'),items.map(it=>Object.assign({},it,{when:fmtW(it.when)})));
  if(!pick) return null;
  let text; try{ text=await drive.download(pick.id); }catch(_){ return {message:t('driveFail'),bad:true}; }
  const d=parseData(text); if(!d) return {message:t('notTracker'),bad:true};
  try{ await replaceAll(d,'before restoring from Drive'); }catch(e){ return {message:e.message,bad:true}; }
  return {message:t('restored',pick.label,fmtN(countTx(d)))};
}

/* the list of versions to open; resolves with the one picked, or null */
function pickRestore(title,items){
  return new Promise(resolve=>{
    const el=panel(`<h2 id="wp-title">${esc(title)}</h2><p class="web-sub">${esc(t('restoreSub'))}</p>
      <ul class="web-list">${items.map((it,i)=>`<li><span><b>${esc(it.label)}</b><small>${esc(it.when||'')}</small></span><button type="button" class="btn sm${i===0?' primary':''}" data-i="${i}">${esc(t('restoreOpen'))}</button></li>`).join('')}</ul>
      <div class="web-acts"><button type="button" class="btn ghost" data-x="cancel">${esc(t('cancel'))}</button></div>`,{overlay:true});
    el.addEventListener('click',e=>{ const b=e.target.closest('button'); if(!b) return; if(b.dataset.x==='cancel'){ el.remove(); resolve(null); return; } if(b.dataset.i!=null){ el.remove(); resolve(items[+b.dataset.i]); } });
  });
}
/* ---------- restoring from this browser: the daily copies and the safety copies (bk: keys) ---------- */
async function browserRestore(){
  let ks=[]; try{ ks=(await idb.keys()).map(String).filter(k=>k.startsWith('bk:')); }catch(_){}
  const items=ks.map(k=>{ const s=k.slice(3);
    if(/^\d{4}-\d{2}-\d{2}$/.test(s)) return {id:k,sort:s+' 0000',label:t('restoreDaily',dmy(s)),when:''};
    const m=s.match(/^(.*) (\d{4}-\d{2}-\d{2}) (\d{2})\.(\d{2})\.\d{2}$/);
    return {id:k,sort:m?m[2]+' '+m[3]+m[4]:'',label:t('restoreOther')+' · '+(m?m[1]:s),when:m?dmy(m[2])+' '+m[3]+':'+m[4]:''};
  }).sort((a,b)=>a.sort<b.sort?1:a.sort>b.sort?-1:0);
  if(!items.length) return {message:t('restoreBNone')};
  const pick=await pickRestore(t('restoreBTitle'),items); if(!pick) return null;
  const text=await idb.get(pick.id).catch(()=>null), d=typeof text==='string'?parseData(text):null;
  if(!d) return {message:t('notTracker'),bad:true};
  try{ await replaceAll(d,'before restoring a backup'); }catch(e){ return {message:e.message,bad:true}; }
  return {message:t('restoredB',pick.label,fmtN(countTx(d)))};
}

/* ---------- files: saving a backup, opening one ---------- */
async function saveFile(name,blob,types){
  if(typeof window.showSaveFilePicker==='function'&&!isMobile()){
    let h; try{ h=await window.showSaveFilePicker({suggestedName:name,startIn:'documents',types}); }catch(e){ if(e&&e.name==='AbortError') return {declined:true}; throw e; }
    const w=await h.createWritable(); await w.write(blob); await w.close(); return {name:h.name,picked:true};
  }
  const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(a.href),4000);
  return {name,picked:false};
}
function pickFile(){
  return new Promise(resolve=>{
    const i=document.createElement('input'); i.type='file'; i.accept='.json,application/json'; i.style.display='none';
    i.addEventListener('change',()=>{ const f=i.files&&i.files[0]; i.remove(); resolve(f||null); });
    i.addEventListener('cancel',()=>{ i.remove(); resolve(null); });
    document.body.appendChild(i); i.click();
  });
}

/* ---------- what the page sees ---------- */
let resolveReady; const ready=new Promise(r=>{ resolveReady=r; });
const db={
  collection(name){ const api={ limit(){ return api; }, onSnapshot(cb){
    ready.then(()=>{ const src=name==='months'?store.months:name==='config'?store.config:{}; cb({docs:Object.keys(src).map(id=>({id,data:()=>clone(src[id])}))}); });
    return ()=>{}; } }; return api; },
  doc(path){ const [col,id]=String(path).split('/'); return { async set(body){
    await ready;
    if(col==='months') store.months[id]=clone(body); else if(col==='config') store.config[id]=clone(body); else return;
    await save(); } }; }
};
const XL='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const downloads={ async save({filename,data}){
  const ext=((filename||'').match(/\.(\w+)$/)||[,'xlsx'])[1].toLowerCase();
  const types=ext==='xlsx'?[{description:'Excel',accept:{[XL]:['.xlsx']}}]:ext==='json'?[{description:t('jsonFilter'),accept:{'application/json':['.json']}}]:ext==='ics'?[{description:'Calendar',accept:{'text/calendar':['.ics']}}]:undefined;
  let r; try{ r=await saveFile(filename,data,types); }catch(_){ throw {code:'failed'}; }
  if(r.declined) throw {code:'declined'};
} };
const local={
  get file(){ return B?B.file():''; },
  get backups(){ return B?B.backups():''; },
  get version(){ return CFG.version||''; },
  get nudge(){ return mode==='browser'; },
  get kind(){ return mode; },
  get status(){
    if(mode==='drive'){
      if(drive.state==='saving') return t('stDriveSaving');
      if(drive.state==='paused') return t('stDrivePaused');
      if(drive.state==='error'&&drive.nextTry) return t('stDriveError',hhmm(drive.nextTry));
      if(drive.state==='offline') return t('barOffline');
      if(drive.state==='signin') return t('barSignIn');
      if(drive.dirty) return t('stDriveWait');
      return drive.lastSync?t('stDrive',hhmm(drive.lastSync)):t('stDriveNever');
    }
    if(mode==='folder') return barKind?t(barKind==='folder'?'barFolder':'barFolderFail'):lastSaved?t('stFolder',hhmm(lastSaved)):'';
    return '';
  },
  text(k,lg){
    seeLang(lg);
    const m={folder:'Folder',drive:'Drive',browser:'Browser'}[mode]; if(!m) return null;
    if(k==='dataFileTitle') return t('dataTitle');
    const w=m==='Browser'&&itp()?' '+t('itpWarn'):'';
    if(k==='dataFileSub') return t('sub'+m)+w;
    if(k==='backupsNote') return t('bk'+m);
    if(k==='gSafeApp') return t('safe'+m)+w;
    if(k==='saveCopy') return t('saveCopy');
    if(k==='saveCopyHelp') return t('saveCopyHelp');
    return null;
  },
  actions:['changeStorage','choosePlace','syncNow','connectDrive','driveRestore','browserRestore'],
  /* the demo put the tracker in this browser without asking; the page asks before its setup wizard */
  needsPlace(){ return mode==='browser'&&!lsGet(PICKED_KEY); },
  async choosePlace(){
    const c=await chooseMode(true,{keep:t('keepBrowser')}); lsSet(PICKED_KEY,'1');
    if(!c||c.mode==='browser') return null;
    try{ const msg=await moveTo(c); window.dispatchEvent(new CustomEvent('ybt-local-render')); return msg?{message:msg}:null; }
    catch(_){ return {message:t('writeFail'),bad:true}; }
  },
  async driveRestore(){ return driveRestore(); },
  async browserRestore(){ return browserRestore(); },
  /* the top-bar button: Connect Google Drive, while it isn't connected */
  top(lg){ seeLang(lg); if(!canDrive()) return null;
    if(mode==='drive'&&drive.valid()) return null;
    return {fn:mode==='drive'?'syncNow':'connectDrive',label:t('topDrive'),help:t('topDriveHelp'),icon:ICONS.drive.replace(/width="22" height="22"/,'width="16" height="16"')}; },
  async connectDrive(){
    if(navigator.onLine===false) return {message:t('driveOffline'),bad:true};
    try{ await drive.signIn(); await drive.locate(); }
    catch(e){ return {message:e&&e.message==='denied'?t('driveDenied'):t('driveFail'),bad:true}; }
    try{ const msg=await moveTo({mode:'drive'}); window.dispatchEvent(new CustomEvent('ybt-local-render')); return msg?{message:msg}:null; }
    catch(_){ return {message:t('writeFail'),bad:true}; }
  },
  extra(lg){
    seeLang(lg);
    const out=[{fn:'changeStorage',label:t('change'),help:t('changeHelp')}];
    if(mode==='drive') out.unshift({fn:'syncNow',label:t('syncNow'),help:t('syncNowHelp')});
    if(mode==='browser') out.push({fn:'browserRestore',label:t('restoreBT'),help:t('restoreBHelp')});
    if(canDrive()) out.push({fn:'driveRestore',label:t('restoreT'),help:t('restoreHelp')});
    return out;
  },

  async changeStorage(){
    const c=await chooseMode(true); if(!c) return null;
    try{ const msg=await moveTo(c); lsSet(PICKED_KEY,'1'); window.dispatchEvent(new CustomEvent('ybt-local-render')); return msg?{message:msg}:null; }
    catch(e){ return {message:t('writeFail'),bad:true}; }
  },
  async syncNow(){
    if(mode!=='drive') return null;
    if(!drive.valid()){ try{ await drive.signIn(); bar(null); }catch(e){ return {message:e&&e.message==='denied'?t('driveDenied'):t('driveFail'),bad:true}; } }
    await driveSync('note');
    return drive.state==='idle'?{message:t('synced')}:null;
  },
  async saveCopy(){
    await queue;
    const name=t('copyName',today());
    try{ const r=await saveFile(name,new Blob([serialise()],{type:'application/json'}),[{description:t('jsonFilter'),accept:{'application/json':['.json']}}]);
      if(r.declined) return null; return {message:r.picked?t('copySaved',r.name):t('copyDownloaded',r.name)}; }
    catch(_){ return {message:t('copyFailed'),bad:true}; }
  },
  async openOther(){
    let f=null, text=null;
    if(typeof window.showOpenFilePicker==='function'&&!isMobile()){
      try{ const [h]=await window.showOpenFilePicker({startIn:'documents',types:[{description:t('jsonFilter'),accept:{'application/json':['.json']}}]}); f=await h.getFile(); }
      catch(e){ if(e&&e.name==='AbortError') return null; }
    }
    if(!f) f=await pickFile();
    if(!f) return null;
    try{ text=await f.text(); }catch(_){ return {message:t('cantRead'),bad:true}; }
    const d=parseData(text); if(!d) return {message:t('notTracker'),bad:true};
    try{ await replaceAll(d,'before opening another file'); }catch(e){ return {message:e.message,bad:true}; }
    return {message:t('opened',f.name,fmtN(countTx(d)))};
  },
  async startFresh(){
    if(!(await askConfirm(t('freshTitle'),t('freshText'),t('freshYes')))) return null;
    try{ await replaceAll(empty(),'before starting fresh'); }catch(e){ return {message:e.message,bad:true}; }
    return {message:t('freshDone')};
  }
};
window.claude={ use:async name=>{
  if(name==='db'){ await ready; return db; }
  if(name==='local'){ await ready; return local; }
  if(name==='user') return {can:async()=>true};
  if(name==='downloads') return downloads;
  if(name==='sample'&&window.YBT_AI) return window.YBT_AI.sample;
  throw {code:'not_granted'};
} };

/* leaving: let the page save now; warn while something hasn't reached the folder yet */
window.addEventListener('beforeunload',e=>{ if(pending>0||saving){ e.preventDefault(); e.returnValue=''; } });

/* ---------- start-up ---------- */
async function startFolder(){
  const h=await idb.get('folder').catch(()=>null);
  if(!h||!canFolder()) return false;
  folder.dir=h; setMode('folder');
  let p=await folder.perm(h,false);
  if(p!=='granted'){
    /* the browser wants a click before it opens the folder again */
    p=await new Promise(resolve=>{
      const el=panel(`<p class="web-eyebrow">MyAhorros</p><h2 id="wp-title">${esc(t('reTitle'))}</h2><p class="web-sub">${esc(t('reText',h.name))}</p>
        <div class="web-acts"><button type="button" class="btn primary" data-x="allow">${esc(t('allow'))}</button><button type="button" class="btn" data-x="other">${esc(t('otherFolder'))}</button><button type="button" class="btn ghost" data-x="browser">${esc(t('useBrowser'))}</button></div>`);
      el.addEventListener('click',async e=>{ const b=e.target.closest('button[data-x]'); if(!b) return; el.busy(true); el.msg('');
        try{
          if(b.dataset.x==='allow'){ if(await folder.perm(h,true)==='granted'){ el.remove(); resolve('granted'); return; } el.msg(t('reDenied')); }
          if(b.dataset.x==='other'){ const d=await folder.pick(); if(d){ folder.dir=d; await idb.set('folder',d); el.remove(); resolve('granted'); return; } }
          if(b.dataset.x==='browser'){ el.remove(); resolve('browser'); return; }
        }catch(_){ el.msg(t('pickedNotAllowed')); }
        el.busy(false); });
    });
    if(p==='browser'){ setMode('browser'); return false; }
  }
  const text=await folder.read();
  const pend=await idb.get('folder-pending').catch(()=>null);
  store=(typeof pend==='string'&&parseData(pend))||await readStored(text);
  /* the file changed (the Windows app, another computer) since this unsaved copy was made: flushFolder then asks which to keep */
  if(typeof pend==='string'){ const base=await idb.get('folder-pending-mod').catch(()=>null); if(base!=null&&text!=null) folder.mod=base; setTimeout(()=>flushFolder(),0); }
  return true;
}
async function startDrive(){
  setMode('drive');
  const c=await drive.cache().catch(()=>null);
  if(c&&typeof c.text==='string'&&parseData(c.text)){
    store=parseData(c.text); drive.dirty=!!c.dirty;
    /* opens straight away from the copy on this device; Drive catches up at once with a pass still kept here, else once signed in */
    drive.restore(); drive.loadGis().catch(()=>{});
    setTimeout(()=>{ if(!store||mode!=='drive') return;
      if(navigator.onLine===false){ drive.state='offline'; bar('offline'); return; }
      if(drive.valid()){ driveSync('note').catch(()=>{}); return; }
      drive.state='signin'; bar('start'); },0);
    return true;
  }
  /* a new device: connect before opening */
  const ok=await new Promise(resolve=>{
    const el=panel(`<p class="web-eyebrow">MyAhorros</p><h2 id="wp-title">${esc(t('driveConnectTitle'))}</h2><p class="web-sub">${esc(t('driveConnectText'))}</p>
      <div class="web-acts"><button type="button" class="btn primary" data-x="go">${esc(t('connect'))}</button><button type="button" class="btn ghost" data-x="browser">${esc(t('useBrowser'))}</button></div>`);
    el.addEventListener('click',async e=>{ const b=e.target.closest('button[data-x]'); if(!b) return;
      if(b.dataset.x==='browser'){ el.remove(); resolve(false); return; }
      el.busy(true); el.msg('');
      try{ await drive.signIn(); await drive.locate();
        const m=drive.meta; let text=null, v=null;
        if(m.fileId){ text=await drive.download(m.fileId); v=(m.remote||{}).version; }
        store=await readStored(text);
        await idb.set('drive',{text:serialise(),version:v,dirty:false}); drive.lastSync=new Date(); drive.state='idle';
        el.remove(); resolve(true);
      }catch(err){ el.busy(false); el.msg(err&&err.message==='denied'?t('driveDenied'):t('driveFail')); } });
  });
  if(!ok){ setMode('browser'); return false; }
  return true;
}
/* does this browser already hold a tracker? A folder can't be read before access is allowed again, so a chosen folder counts */
async function hasData(m){
  if(m==='folder') return true;
  const text=m==='drive'?((await idb.get('drive').catch(()=>null))||{}).text:await browser.read().catch(()=>null);
  const s=text&&parseData(text); return !!s&&!nothingAdded(s);
}
async function start(){
  let m=lsGet(MODE_KEY);
  /* typing the address always shows the landing page first; a reload goes straight back to the tracker */
  const nav=(performance.getEntriesByType&&performance.getEntriesByType('navigation')[0])||{};
  let first=nav.type==='reload'?null:await landing(!!m&&await hasData(m));
  if(m==='folder'&&!(await startFolder())) m=mode;
  if(m==='drive'&&!(await startDrive().catch(()=>false))) m=mode||'browser';
  if(!store&&m==='browser'){ setMode('browser'); const text=await browser.read().catch(()=>null); store=await readStored(text); }
  /* nothing added yet (no transactions, no accounts or figures): ask again only if the demo chose for them, or they asked for the demo now.
     A place the person picked themselves stays picked, so a refresh in the middle of setting up doesn't ask twice */
  if(store&&nothingAdded(store)&&(first==='demo'||!lsGet(PICKED_KEY))){ store=null; bar(null); }
  if(!store){
    /* nothing here yet: where should it live? (a reload skipped the landing above, so show it now to people who never picked a place) */
    if(!first) first=m?'start':await landing();
    let c;
    if(first==='demo'){ try{ sessionStorage.setItem('ybt.autotour','1'); }catch(_){} c={mode:'browser'}; }
    else { c=await chooseMode(false); lsSet(PICKED_KEY,'1'); }
    if(c.mode==='folder'){ folder.dir=c.dir; await idb.set('folder',c.dir); setMode('folder'); const text=await folder.read(); store=await readStored(text); }
    else if(c.mode==='drive'){ setMode('drive'); const mm=drive.meta; let text=null, v=null; if(mm.fileId){ text=await drive.download(mm.fileId); v=(mm.remote||{}).version; }
      store=await readStored(text); await idb.set('drive',{text:serialise(),version:v,dirty:false}); drive.lastSync=new Date(); drive.state='idle'; }
    else { setMode('browser'); const text=await browser.read().catch(()=>null); store=await readStored(text); }
  }
  resolveReady();
  notify();
}
/* ---------- one tab at a time: two tabs each saving their own copy would overwrite each other ----------
   The newest tab takes over. The older one saves what it has, lets go of the lock and stops. */
let letGo=null;
const tabCh=typeof BroadcastChannel==='function'?new BroadcastChannel('myahorros-tab'):null;
function grab(opts){ return new Promise(res=>{ navigator.locks.request('myahorros-tab',opts,l=>{ res(!!l); return l?new Promise(r=>{ letGo=r; }):null; }).catch(()=>res(false)); }); }
async function takeTab(){
  if(tabCh) tabCh.postMessage('take');
  if(!navigator.locks) return;
  if(await grab({ifAvailable:true})) return;
  /* a tab frozen in the background can't answer: after 3 seconds take over anyway */
  const ac=new AbortController();
  if(!(await Promise.race([grab({signal:ac.signal}),sleep(3000).then(()=>false)]))){ ac.abort(); await grab({steal:true}); }
}
let leaving=false;
if(tabCh) tabCh.onmessage=async e=>{
  if(e.data!=='take'||asleep||leaving) return;
  /* an edit from the last moment may still be in the page: have it saved before stopping (at most 2 s) */
  leaving=true;
  await new Promise(r=>{ window.dispatchEvent(new CustomEvent('ybt-flush',{detail:{done:r}})); setTimeout(r,2000); });
  await queue;
  asleep=true; clearTimeout(upT); clearTimeout(busyT);
  const el=panel(`<p class="web-eyebrow">MyAhorros</p><h2 id="wp-title">${esc(t('tabTitle'))}</h2><p class="web-sub">${esc(t('tabText'))}</p>
    <div class="web-acts"><button type="button" class="btn primary" data-x="here">${esc(t('tabHere'))}</button></div>`);
  for(const c of document.body.children) if(c!==el) c.inert=true;
  el.addEventListener('click',ev=>{ if(ev.target.closest('button[data-x="here"]')) location.reload(); });
  await queue;
  if(letGo){ letGo(); letGo=null; }
};
/* the folder or Drive didn't open: say so and offer another try, rather than quietly switching to this browser for good */
function startFailed(was){
  return new Promise(resolve=>{
    const el=panel(`<p class="web-eyebrow">MyAhorros</p><h2 id="wp-title">${esc(t('startFailTitle'))}</h2><p class="web-sub">${esc(t(was==='folder'?'startFailFolder':'startFailDrive'))}</p>
      <div class="web-acts"><button type="button" class="btn primary" data-x="retry">${esc(t('tryAgain'))}</button><button type="button" class="btn ghost" data-x="browser">${esc(t('useBrowser'))}</button></div>`);
    el.addEventListener('click',e=>{ const b=e.target.closest('button[data-x]'); if(!b) return; el.remove(); resolve(b.dataset.x); });
  });
}
takeTab().catch(()=>{}).then(start).catch(async e=>{ console.error('storage start failed',e);
  const was=lsGet(MODE_KEY);
  if((was==='folder'||was==='drive')&&await startFailed(was)==='retry'){ location.reload(); return; }
  setMode('browser'); browser.read().then(async x=>{ store=await readStored(x); resolveReady(); },()=>{ store=empty(); resolveReady(); }); });

/* for the tests */
window.__ybtWeb={get mode(){ return mode; }, get store(){ return store; }, drive, folder, idb, sync:()=>driveSync(true), queue:()=>queue};
})();
