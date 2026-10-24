package statuspage

import (
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"html/template"
	"slices"
	"strconv"
	"strings"
)

// view is what the page template shows: the devices to a signed-in visitor,
// or the sign-in form with what went wrong.
type view struct {
	Lang  string
	Text  messages
	Style template.CSS
	// SignedIn shows the devices instead of the sign-in form.
	SignedIn bool
	Summary  string
	Devices  []deviceView
	// Problem is what went wrong signing in, or why nobody can.
	Problem string
	// Form shows the password field.
	Form bool
}

type deviceView struct {
	Name      string
	State     State
	StateText string
	// Alerts is how many alerts the device has, AlertsText that in words.
	Alerts     int
	AlertsText string
}

// hostHub is how the page names the hub when DEVICE_NAME is not set, as the
// website does.
const hostHub = "Host Hub"

func statusView(text messages, devices []Device) view {
	v := view{Lang: text.Lang, Text: text, Style: pageStyle, SignedIn: true}
	online := 0
	for _, d := range devices {
		name := strings.TrimSpace(d.Name)
		if name == "" {
			name = hostHub
		}
		state := text.Online
		switch d.State {
		case Online:
			online++
		case Offline:
			state = text.Offline
		case Off:
			state = text.Off
		}
		alerts := text.NoAlerts
		if d.Alerts == 1 {
			alerts = text.OneAlert
		} else if d.Alerts > 1 {
			alerts = fmt.Sprintf(text.Alerts, d.Alerts)
		}
		v.Devices = append(v.Devices, deviceView{Name: name, State: d.State, StateText: state, Alerts: d.Alerts, AlertsText: alerts})
	}
	v.Summary = fmt.Sprintf(text.Summary, online, len(devices))
	return v
}

func loginView(text messages, problem string, form bool) view {
	return view{Lang: text.Lang, Text: text, Style: pageStyle, Problem: problem, Form: form}
}

// messages is the page's text in one language.
type messages struct {
	Lang     string
	Title    string
	Password string
	SignIn   string
	SignOut  string
	Wrong    string
	TooMany  string
	NotSet   string
	Failed   string
	Online   string
	Offline  string
	Off      string
	NoAlerts string
	OneAlert string
	// Alerts and Summary are formats: the number of alerts, and how many
	// devices of how many are online.
	Alerts  string
	Summary string
	Refresh string
}

// languages are the page's languages; the first is used when the browser
// asks for none of them.
var languages = []messages{
	{
		Lang:     "en",
		Title:    "Device status",
		Password: "Password",
		SignIn:   "Sign in",
		SignOut:  "Sign out",
		Wrong:    "The password is wrong.",
		TooMany:  "Too many wrong passwords. Try again in 15 minutes.",
		NotSet:   "No password is set yet. Set one on the hub's page, under Devices.",
		Failed:   "Something went wrong. Try again.",
		Online:   "Online",
		Offline:  "Offline",
		Off:      "Switched off",
		NoAlerts: "No alerts",
		OneAlert: "1 alert",
		Alerts:   "%d alerts",
		Summary:  "%d of %d online",
		Refresh:  "Refreshes every minute.",
	},
	{
		Lang:     "de",
		Title:    "Gerätestatus",
		Password: "Passwort",
		SignIn:   "Anmelden",
		SignOut:  "Abmelden",
		Wrong:    "Das Passwort ist falsch.",
		TooMany:  "Zu viele falsche Passwörter. Versuche es in 15 Minuten wieder.",
		NotSet:   "Noch ist kein Passwort gesetzt. Lege eines auf der Seite des Hubs unter Geräte fest.",
		Failed:   "Etwas ist schiefgegangen. Versuche es noch einmal.",
		Online:   "Online",
		Offline:  "Offline",
		Off:      "Ausgeschaltet",
		NoAlerts: "Keine Alarme",
		OneAlert: "1 Alarm",
		Alerts:   "%d Alarme",
		Summary:  "%d von %d online",
		Refresh:  "Aktualisiert sich jede Minute.",
	},
	{ //nolint:gosec // the word "password", not one
		Lang:     "fr",
		Title:    "État des appareils",
		Password: "Mot de passe",
		SignIn:   "Se connecter",
		SignOut:  "Se déconnecter",
		Wrong:    "Le mot de passe est incorrect.",
		TooMany:  "Trop de mots de passe incorrects. Réessayez dans 15 minutes.",
		NotSet:   "Aucun mot de passe n’est encore défini. Définissez-en un sur la page du hub, sous Appareils.",
		Failed:   "Une erreur s’est produite. Réessayez.",
		Online:   "En ligne",
		Offline:  "Hors ligne",
		Off:      "Éteint",
		NoAlerts: "Aucune alerte",
		OneAlert: "1 alerte",
		Alerts:   "%d alertes",
		Summary:  "%d sur %d en ligne",
		Refresh:  "Actualisé chaque minute.",
	},
	{ //nolint:gosec // the word "password", not one
		Lang:     "es",
		Title:    "Estado de los dispositivos",
		Password: "Contraseña",
		SignIn:   "Iniciar sesión",
		SignOut:  "Cerrar sesión",
		Wrong:    "La contraseña no es correcta.",
		TooMany:  "Demasiadas contraseñas incorrectas. Inténtalo de nuevo en 15 minutos.",
		NotSet:   "Aún no hay contraseña. Elige una en la página del hub, en Dispositivos.",
		Failed:   "Algo salió mal. Inténtalo de nuevo.",
		Online:   "En línea",
		Offline:  "Sin conexión",
		Off:      "Apagado",
		NoAlerts: "Sin alertas",
		OneAlert: "1 alerta",
		Alerts:   "%d alertas",
		Summary:  "%d de %d en línea",
		Refresh:  "Se actualiza cada minuto.",
	},
}

// messagesFor picks the language the browser likes best from its
// Accept-Language header, such as "de-DE,de;q=0.9,en;q=0.8".
func messagesFor(acceptLanguage string) messages {
	type wish struct {
		lang string
		q    float64
	}
	var wishes []wish
	for part := range strings.SplitSeq(acceptLanguage, ",") {
		tag, params, _ := strings.Cut(strings.TrimSpace(part), ";")
		q := 1.0
		if value, ok := strings.CutPrefix(strings.TrimSpace(params), "q="); ok {
			parsed, err := strconv.ParseFloat(value, 64)
			if err != nil {
				continue
			}
			q = parsed
		}
		lang, _, _ := strings.Cut(strings.ToLower(strings.TrimSpace(tag)), "-")
		if q > 0 && lang != "" {
			wishes = append(wishes, wish{lang, q})
		}
	}
	slices.SortStableFunc(wishes, func(a, b wish) int {
		switch {
		case a.q > b.q:
			return -1
		case a.q < b.q:
			return 1
		}
		return 0
	})
	for _, w := range wishes {
		for _, m := range languages {
			if m.Lang == w.lang {
				return m
			}
		}
	}
	return languages[0]
}

// style is the page's only style, allowed by its hash in the
// Content-Security-Policy, so nothing else can style the page.
const style = `
:root { color-scheme: light dark; --bg: #17120f; --card: #221b16; --text: #f1e9e2; --muted: #b3a497; --line: #3a2f27;
  --online: #3fb950; --offline: #f85149; --off: #8b8178; --alert: #f0a030; --button: #c9773a; }
@media (prefers-color-scheme: light) {
  :root { --bg: #faf6f2; --card: #ffffff; --text: #241c16; --muted: #6b5d52; --line: #e8ddd3;
    --online: #1a7f37; --offline: #c62828; --off: #7a6f66; --alert: #b26a00; --button: #b0602a; }
}
* { box-sizing: border-box; }
body { margin: 0; min-height: 100vh; background: var(--bg); color: var(--text);
  font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 32rem; margin: 0 auto; padding: 2rem 1rem; }
h1 { font-size: 1.4rem; margin: 0 0 .25rem; }
.summary { color: var(--muted); margin: 0 0 1.25rem; }
ul { list-style: none; margin: 0; padding: 0; background: var(--card); border: 1px solid var(--line); border-radius: 12px; }
li { display: flex; align-items: center; gap: .75rem; padding: .8rem 1rem; }
li + li { border-top: 1px solid var(--line); }
.dot { flex: none; width: .75rem; height: .75rem; border-radius: 50%; background: var(--off); }
.online .dot { background: var(--online); }
.offline .dot { background: var(--offline); }
.who { flex: 1; min-width: 0; }
.name { display: block; font-weight: 600; overflow-wrap: anywhere; }
.state { color: var(--muted); font-size: .9rem; }
.offline .state { color: var(--offline); }
.alerts { flex: none; font-size: .9rem; color: var(--muted); }
.alerts.some { color: var(--alert); font-weight: 600; }
form.login { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 1rem; display: grid; gap: .75rem; }
label { font-size: .9rem; color: var(--muted); }
input { width: 100%; padding: .6rem .75rem; font: inherit; color: var(--text); background: var(--bg);
  border: 1px solid var(--line); border-radius: 8px; }
button { font: inherit; padding: .55rem 1rem; border-radius: 8px; cursor: pointer; }
.primary { border: 0; background: var(--button); color: #fff; font-weight: 600; }
.quiet { border: 1px solid var(--line); background: transparent; color: var(--text); }
.problem { color: var(--offline); margin: 0 0 1rem; }
footer { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-top: 1rem; color: var(--muted); font-size: .85rem; }
footer form { margin: 0; }
`

// pageStyle is style for the template, which is written in this file.
var pageStyle = template.CSS(style) //nolint:gosec // a constant, not input

// styleHash allows style in the Content-Security-Policy.
var styleHash = func() string {
	sum := sha256.Sum256([]byte(style))
	return "sha256-" + base64.StdEncoding.EncodeToString(sum[:])
}()

// pageTemplate is the whole page. Signed in, it reloads itself every minute.
var pageTemplate = template.Must(template.New("page").Parse(`<!doctype html>
<html lang="{{.Lang}}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
{{if .SignedIn}}<meta http-equiv="refresh" content="60">
{{end}}<link rel="icon" href="data:,">
<title>{{.Text.Title}}</title>
<style>{{.Style}}</style>
</head>
<body>
<main>
<h1>{{.Text.Title}}</h1>
{{if .SignedIn -}}
<p class="summary">{{.Summary}}</p>
<ul>
{{- range .Devices}}
<li class="{{.State}}"><span class="dot" aria-hidden="true"></span><span class="who"><span class="name">{{.Name}}</span><span class="state">{{.StateText}}</span></span><span class="alerts{{if .Alerts}} some{{end}}">{{.AlertsText}}</span></li>
{{- end}}
</ul>
<footer><span>{{.Text.Refresh}}</span><form method="post" action="/logout"><button class="quiet" type="submit">{{.Text.SignOut}}</button></form></footer>
{{- else -}}
{{if .Problem}}<p class="problem" role="alert">{{.Problem}}</p>
{{end}}{{if .Form}}<form class="login" method="post" action="/login">
<label for="password">{{.Text.Password}}</label>
<input id="password" name="password" type="password" autocomplete="current-password" required autofocus>
<button class="primary" type="submit">{{.Text.SignIn}}</button>
</form>
{{end}}{{- end}}
</main>
</body>
</html>
`))
