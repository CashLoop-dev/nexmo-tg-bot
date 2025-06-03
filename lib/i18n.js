const translations = {
  en: {
    language_set: "Language set to English.",
    choose_language: "Choose your language:",
    welcome: "Welcome! Use /call to make a call, or /history to see your calls. Use /help for commands.",
    not_authorized: "You are not authorized to use this bot.",
    call_limit: "You are making calls too frequently. Please wait a bit.",
    call_prompt: "Enter phone number to call:",
    call_scheduled: "Call scheduled.",
    call_now: "Call started.",
    call_failed: "Call failed: {error}",
    choose_survey: "Choose a survey to take:",
    no_surveys: "No surveys available.",
    survey_not_found: "Survey not found.",
    survey_complete: "Thank you for completing the survey!",
    admin_panel: "Admin Panel:",
    // ...other keys
  },
  es: {
    language_set: "Idioma cambiado a Español.",
    choose_language: "Elige tu idioma:",
    welcome: "¡Bienvenido! Usa /call para llamar, /history para tu historial. Usa /help para comandos.",
    not_authorized: "No estás autorizado para usar este bot.",
    call_limit: "Estás llamando demasiado rápido. Espera un poco.",
    call_prompt: "Introduce el número de teléfono a llamar:",
    call_scheduled: "Llamada programada.",
    call_now: "Llamada iniciada.",
    call_failed: "Llamada fallida: {error}",
    choose_survey: "Elige una encuesta:",
    no_surveys: "No hay encuestas disponibles.",
    survey_not_found: "Encuesta no encontrada.",
    survey_complete: "¡Gracias por completar la encuesta!",
    admin_panel: "Panel de administración:",
    // ...other keys
  },
  fr: {
    language_set: "Langue définie sur le français.",
    choose_language: "Choisissez votre langue :",
    welcome: "Bienvenue ! Utilisez /call pour appeler, /history pour l'historique. /help pour les commandes.",
    not_authorized: "Vous n'êtes pas autorisé à utiliser ce bot.",
    call_limit: "Vous appelez trop fréquemment. Veuillez patienter.",
    call_prompt: "Entrez le numéro de téléphone à appeler :",
    call_scheduled: "Appel programmé.",
    call_now: "Appel lancé.",
    call_failed: "Échec de l'appel : {error}",
    choose_survey: "Choisissez une enquête à remplir :",
    no_surveys: "Aucune enquête disponible.",
    survey_not_found: "Enquête introuvable.",
    survey_complete: "Merci d'avoir complété l'enquête !",
    admin_panel: "Panneau d'administration :",
    // ...other keys
  }
};

module.exports = {
  t: (lang, key, params = {}) => {
    let str = (translations[lang] && translations[lang][key]) || translations.en[key] || key;
    Object.entries(params).forEach(([k, v]) => {
      str = str.replace(`{${k}}`, v);
    });
    return str;
  }
};