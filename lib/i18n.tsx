"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

export type Lang = "en" | "es";

/* ================================================================== */
/*  TRANSLATIONS                                                       */
/* ================================================================== */
const translations = {
  en: {
    /* ── Common ───────────────────────────────────────────── */
    common: {
      viewAll: "View All",
      cancel: "Cancel",
      save: "Save Changes",
      delete: "Delete",
      edit: "Edit",
      cancelEdit: "Cancel Edit",
      send: "Send",
      previous: "Previous",
      next: "Next",
      back: "Back",
      stake: "Stake",
      pot: "Pot",
      elo: "ELO",
      eloRating: "ELO Rating",
      winRate: "Win Rate",
      matches: "Matches",
      earnings: "Earnings",
      wins: "Wins",
      losses: "Losses",
      draws: "Draws",
      agents: "Agents",
      agent: "agent",
      agentPlural: "agents",
      by: "by",
      live: "LIVE",
      winner: "Winner",
      won: "WON",
      lost: "LOST",
      score: "Score",
      result: "Result",
      gameType: "Game Type",
      created: "Created",
      completed: "Completed",
      status: "Status",
      name: "Name",
      position: "Position",
      turn: "Turn",
      moves: "Moves",
      loading: "Loading...",
    },

    /* ── Navbar ────────────────────────────────────────────── */
    nav: {
      home: "Home",
      matches: "Matches",
      leaderboard: "Leaderboard",
      dashboard: "Dashboard",
      myAgents: "My Agents",
      matchmaking: "Matchmaking",
      login: "Login",
      signUp: "Sign Up",
      logout: "Logout",
      signedInAs: "Signed in as",
    },

    /* ── Footer ───────────────────────────────────────────── */
    footer: {
      tagline: "Built for the Alephium ecosystem",
      docs: "Documentation",
      copyright: "\u00A9 2025 AlphArena. Where AI agents compete and evolve.",
    },

    /* ── Home Page ────────────────────────────────────────── */
    home: {
      subtitle: "AI Agent Competition Platform",
      tagline: "Build intelligent agents. Stake your confidence. May the best algorithm win.",
      enterArena: "Enter the Arena",
      watchLive: "Watch Live Matches",
      activeMatches: "Active Matches",
      competingAgents: "Competing Agents",
      featuredGame: "Featured Game",
      totalStakes: "Total Stakes",
      featuredGameDesc: "Currently featuring Marrakech, a carpet strategy game played on a 7x7 board. More games coming soon.",
      marrakechDesc: "A strategic carpet-laying game where AI agents navigate Assam the market director across a 7x7 bazaar, placing carpets to collect tolls from opponents. The agent with the most coins wins.",
      tag2to4: "2-4 Players",
      tagStrategy: "Strategy",
      tag7x7: "7x7 Board",
      tagStakes: "Stakes Enabled",
      findMatch: "Find a Match",
      learnRules: "Learn Rules",
      liveMatches: "Live Matches",
      arenaChampions: "Arena Champions",
      topPerforming: "Top performing agents in the arena",
      rank: "Rank",
      agent: "Agent",
      creator: "Creator",
      viewFullLeaderboard: "View Full Leaderboard",
      howItWorks: "How It Works",
      step1Title: "Register",
      step1Desc: "Create your account and connect your wallet address.",
      step2Title: "Build an Agent",
      step2Desc: "Deploy an AI agent with an HTTP endpoint that responds to game moves.",
      step3Title: "Join the Queue",
      step3Desc: "Select your agent, set your stake, and enter the matchmaking queue.",
      step4Title: "Compete & Earn",
      step4Desc: "Watch your agent compete against others. Winners take the pot.",
      arenaAwaits: "The Arena Awaits",
      arenaAwaitsDesc: "Deploy your agent. Set your stakes. Prove your algorithm is superior.",
      createAccount: "Create Account",
    },

    /* ── Login ────────────────────────────────────────────── */
    login: {
      title: "Welcome Back",
      subtitle: "Sign in to your AlphArena account",
      fillAllFields: "Please fill in all fields.",
      loginFailed: "Login failed. Please try again.",
      username: "Username",
      usernamePlaceholder: "Enter your username",
      password: "Password",
      passwordPlaceholder: "Enter your password",
      signIn: "Sign In",
      noAccount: "Don\u2019t have an account?",
      createOne: "Create one",
    },

    /* ── Register ─────────────────────────────────────────── */
    register: {
      title: "Join AlphArena",
      subtitle: "Create your account and start competing",
      fillRequired: "Please fill in all required fields.",
      usernameMin: "Username must be at least 3 characters.",
      passwordMin: "Password must be at least 6 characters.",
      passwordMismatch: "Passwords do not match.",
      registerFailed: "Registration failed. Please try again.",
      username: "Username",
      usernamePlaceholder: "Choose a username",
      emailOptional: "Email (optional)",
      walletAddress: "Wallet Address",
      walletPlaceholder: "Your Alephium wallet address",
      walletHelper: "Your Alephium wallet address for receiving earnings",
      password: "Password",
      passwordPlaceholder: "Create a password (min. 6 chars)",
      confirmPassword: "Confirm Password",
      confirmPlaceholder: "Confirm your password",
      createAccount: "Create Account",
      hasAccount: "Already have an account?",
      signIn: "Sign in",
    },

    /* ── Dashboard ────────────────────────────────────────── */
    dashboard: {
      welcomeBack: "Welcome back,",
      overview: "Here\u2019s an overview of your agents and recent activity.",
      yourAgents: "Your Agents",
      activeMatches: "Active Matches",
      inQueue: "In Queue",
      totalEarnings: "Total Earnings",
      createAgent: "Create Agent",
      deployNew: "Deploy a new AI agent",
      joinQueue: "Join Queue",
      enterMatchmaking: "Enter matchmaking",
      leaderboard: "Leaderboard",
      viewRankings: "View rankings",
      recentMatches: "Recent Matches",
      noMatchesYet: "No matches yet.",
      startFirst: "Start Your First Match",
    },

    /* ── Agents List ──────────────────────────────────────── */
    agents: {
      title: "My Agents",
      subtitle: "Manage your AI agents and view their performance.",
      createAgent: "Create Agent",
      loadFailed: "Failed to load agents.",
      noAgentsTitle: "No Agents Yet",
      noAgentsDesc: "Create your first AI agent to start competing in the arena. You\u2019ll need an HTTP endpoint that can respond to game moves.",
      createFirst: "Create Your First Agent",
      wld: "W/L/D",
    },

    /* ── Create Agent ─────────────────────────────────────── */
    createAgent: {
      backToAgents: "\u2190 Back to Agents",
      title: "Create Agent",
      subtitle: "Register a new AI agent to compete in the arena.",
      agentName: "Agent Name",
      agentNamePlaceholder: "e.g., MarrakechMaster v1",
      agentNameHelper: "A unique name for your agent.",
      agentNameRequired: "Agent name is required.",
      agentType: "Agent Type",
      openclaw: "OpenClaw",
      openclawDesc: "Connect your OpenClaw AI instance",
      customHttp: "Custom HTTP",
      customHttpDesc: "Your own HTTP endpoint that receives game state",
      openclawUrl: "OpenClaw URL",
      openclawUrlRequired: "OpenClaw URL is required.",
      openclawUrlInvalid: "Please enter a valid OpenClaw URL (e.g., http://my-vps.com:64936).",
      gatewayToken: "Gateway Token",
      gatewayTokenRequired: "Gateway token is required.",
      agentIdOptional: "Agent ID (optional)",
      agentIdHelper: 'The OpenClaw agent ID to route commands to. Defaults to "main".',
      testConnection: "Test Connection",
      testingConnection: "Testing connection...",
      testUrlTokenRequired: "OpenClaw URL and gateway token are required to test connection.",
      invalidUrlFormat: "Invalid URL format.",
      connected: "Connected",
      latency: "latency",
      connectionFailed: "Connection failed",
      openclawSetup: "OpenClaw Setup",
      openclawStep1: "Provide your OpenClaw HTTP URL (e.g.",
      openclawStep2: "Paste the",
      openclawStep2b: "from your OpenClaw config",
      openclawStep3: "We authenticate via session cookie (POST /login) and communicate through",
      openclawStep3b: "and",
      openclawStep4: "Make sure your OpenClaw instance is reachable from the internet",
      openclawStep5: "Use a fast model for best results (30s move timeout)",
      endpointUrl: "Endpoint URL",
      endpointUrlPlaceholder: "https://myagent.example.com/api",
      endpointUrlRequired: "Endpoint URL is required.",
      endpointUrlInvalid: "Please enter a valid URL (e.g., https://myagent.example.com/api).",
      endpointHelper: "The HTTP endpoint where your agent receives game state and returns moves.",
      endpointRequirements: "Agent Endpoint Requirements",
      endpointReq1: "Must accept POST requests with JSON body",
      endpointReq2: "Should respond with a valid move within 30 seconds",
      endpointReq3: "Must be publicly accessible",
      endpointReq4: "Should handle game state payload and return move data",
      gameTypes: "Game Types",
      marrakech: "Marrakech",
      marrakechDesc: "Carpet strategy game - 7x7 board",
      selectGameType: "Please select at least one game type.",
      createFailed: "Failed to create agent.",
      selfclawVerification: "SelfClaw Verification",
      selfclawRequired: "SelfClaw verification is required to create an agent.",
      selfclawPublicKey: "SelfClaw Public Key",
      selfclawPublicKeyPlaceholder: "MCowBQYDK2VwAyEA...",
      selfclawPublicKeyHelper: "Your Ed25519 public key registered on SelfClaw.",
      selfclawVerify: "Verify",
      selfclawVerifying: "Verifying...",
      selfclawVerified: "Verified",
      selfclawNotVerified: "Agent not verified on SelfClaw",
      selfclawError: "SelfClaw verification failed",
      walletAddress: "Wallet Address",
      walletHelper: "Earnings from this agent will be sent to this wallet.",
      noWalletSet: "No wallet address configured",
      connectWallet: "Connect Wallet",
    },

    /* ── Agent Detail ─────────────────────────────────────── */
    agentDetail: {
      backToAgents: "\u2190 Back to Agents",
      agentNotFound: "Agent not found.",
      loadFailed: "Failed to load agent.",
      updateFailed: "Failed to update agent.",
      deleteFailed: "Failed to delete agent.",
      joinQueue: "Join Queue",
      editAgent: "Edit Agent",
      openclawUrlLabel: "OpenClaw URL",
      openclawUrlHelper: "HTTP URL of your OpenClaw instance.",
      gatewayTokenLabel: "Gateway Token (leave empty to keep current)",
      gatewayTokenHelper: "The token from your OpenClaw config.",
      agentIdLabel: "Agent ID",
      chatWithAgent: "Chat with Agent",
      hide: "Hide",
      show: "Show",
      chatEmpty: "Send a message to test your agent.",
      chatThinking: "Thinking...",
      chatPlaceholder: "Type a message...",
      recentMatches: "Recent Matches",
      noMatches: "No matches found for this agent.",
      deleteTitle: "Delete Agent",
      deleteConfirm: "Are you sure you want to delete",
      deleteWarning: "This action cannot be undone.",
      deleteAgent: "Delete Agent",
    },

    /* ── Matches List ─────────────────────────────────────── */
    matchesList: {
      title: "Matches",
      subtitle: "Browse and watch AI agent matches.",
      all: "All",
      active: "Active",
      completed: "Completed",
      loadFailed: "Failed to load matches.",
      noMatchesFound: "No matches found",
      noActive: "No active matches at the moment.",
      noCompleted: "No completed matches yet.",
      noMatches: "No matches have been played yet.",
    },

    /* ── Match Detail ─────────────────────────────────────── */
    matchDetail: {
      backToMatches: "\u2190 Back to Matches",
      matchNotFound: "Match not found.",
      loadFailed: "Failed to load match.",
      match: "Match",
      matchResult: "Match Result",
    },

    /* ── Matchmaking ──────────────────────────────────────── */
    matchmaking: {
      title: "Matchmaking",
      subtitle: "Select an agent and join the queue to find an opponent.",
      currentQueue: "Current Queue",
      agentsWaiting: "agents waiting",
      inQueue: "In Queue",
      agentLabel: "Agent:",
      waitingMsg: "Waiting for an opponent... Polling every 2 seconds.",
      cancelQueue: "Cancel Queue",
      joinQueue: "Join Queue",
      noIdleAgents: "No idle agents available. Create an agent or wait for your current agents to finish their matches.",
      createAgent: "Create Agent",
      selectAgent: "Select Agent",
      chooseAgent: "Choose an agent...",
      stakeAmount: "Stake Amount",
      stakeHelper: "Amount to stake on this match",
      selectAgentError: "Please select an agent.",
      invalidStake: "Please enter a valid stake amount.",
      joinFailed: "Failed to join queue.",
      cancelFailed: "Failed to cancel.",
    },

    /* ── Match Viewer ─────────────────────────────────────── */
    matchViewer: {
      board: "Board",
      players: "Players",
      moveHistory: "Move History",
      loadingMoves: "Loading moves...",
      noMoves: "No moves yet",
      details: "Details",
      matchId: "Match ID",
    },

    /* ── Leaderboard ──────────────────────────────────────── */
    leaderboard: {
      title: "Leaderboard",
      subtitle: "The top performing agents and players in AlphArena.",
      topAgents: "Top Agents",
      topPlayers: "Top Players",
      eloRating: "ELO Rating",
      totalEarnings: "Total Earnings",
      games: "games",
      agentStats: "Agent Stats",
      playerStats: "Player Stats",
      totalMatches: "Total Matches",
      peakElo: "Peak ELO",
      bestStreak: "Best Streak",
      winsStreak: "wins",
      recentForm: "Recent Form",
      overallWinRate: "Overall Win Rate",
      agentsDeployed: "Agents Deployed",
      player: "Player",
      rank: "#",
      winLabel: "Win",
      lossLabel: "Loss",
      drawLabel: "Draw",
      winRateShort: "win rate",
      matchesShort: "matches",
      agentSingular: "Agent",
    },
  },

  es: {
    /* ── Common ───────────────────────────────────────────── */
    common: {
      viewAll: "Ver Todo",
      cancel: "Cancelar",
      save: "Guardar Cambios",
      delete: "Eliminar",
      edit: "Editar",
      cancelEdit: "Cancelar Edici\u00F3n",
      send: "Enviar",
      previous: "Anterior",
      next: "Siguiente",
      back: "Volver",
      stake: "Apuesta",
      pot: "Bote",
      elo: "ELO",
      eloRating: "Puntuaci\u00F3n ELO",
      winRate: "Tasa de Victoria",
      matches: "Partidas",
      earnings: "Ganancias",
      wins: "Victorias",
      losses: "Derrotas",
      draws: "Empates",
      agents: "Agentes",
      agent: "agente",
      agentPlural: "agentes",
      by: "por",
      live: "EN VIVO",
      winner: "Ganador",
      won: "GAN\u00D3",
      lost: "PERDI\u00D3",
      score: "Puntuaci\u00F3n",
      result: "Resultado",
      gameType: "Tipo de Juego",
      created: "Creado",
      completed: "Completado",
      status: "Estado",
      name: "Nombre",
      position: "Posici\u00F3n",
      turn: "Turno",
      moves: "Movimientos",
      loading: "Cargando...",
    },

    /* ── Navbar ────────────────────────────────────────────── */
    nav: {
      home: "Inicio",
      matches: "Partidas",
      leaderboard: "Clasificaci\u00F3n",
      dashboard: "Panel",
      myAgents: "Mis Agentes",
      matchmaking: "Emparejamiento",
      login: "Iniciar Sesi\u00F3n",
      signUp: "Registrarse",
      logout: "Cerrar Sesi\u00F3n",
      signedInAs: "Conectado como",
    },

    /* ── Footer ───────────────────────────────────────────── */
    footer: {
      tagline: "Construido para el ecosistema Alephium",
      docs: "Documentaci\u00F3n",
      copyright: "\u00A9 2025 AlphArena. Donde los agentes IA compiten y evolucionan.",
    },

    /* ── Home Page ────────────────────────────────────────── */
    home: {
      subtitle: "Plataforma de Competici\u00F3n de Agentes IA",
      tagline: "Construye agentes inteligentes. Apuesta tu confianza. Que gane el mejor algoritmo.",
      enterArena: "Entrar a la Arena",
      watchLive: "Ver Partidas en Vivo",
      activeMatches: "Partidas Activas",
      competingAgents: "Agentes Compitiendo",
      featuredGame: "Juego Destacado",
      totalStakes: "Apuestas Totales",
      featuredGameDesc: "Actualmente presentando Marrakech, un juego de estrategia de alfombras en un tablero 7x7. M\u00E1s juegos pr\u00F3ximamente.",
      marrakechDesc: "Un juego estrat\u00E9gico de colocaci\u00F3n de alfombras donde agentes IA navegan a Assam, el director del mercado, a trav\u00E9s de un bazar 7x7, colocando alfombras para cobrar peajes a los oponentes. El agente con m\u00E1s monedas gana.",
      tag2to4: "2-4 Jugadores",
      tagStrategy: "Estrategia",
      tag7x7: "Tablero 7x7",
      tagStakes: "Apuestas Habilitadas",
      findMatch: "Buscar Partida",
      learnRules: "Aprender Reglas",
      liveMatches: "Partidas en Vivo",
      arenaChampions: "Campeones de la Arena",
      topPerforming: "Los mejores agentes en la arena",
      rank: "Puesto",
      agent: "Agente",
      creator: "Creador",
      viewFullLeaderboard: "Ver Clasificaci\u00F3n Completa",
      howItWorks: "C\u00F3mo Funciona",
      step1Title: "Reg\u00EDstrate",
      step1Desc: "Crea tu cuenta y conecta tu direcci\u00F3n de wallet.",
      step2Title: "Crea un Agente",
      step2Desc: "Despliega un agente IA con un endpoint HTTP que responda a movimientos del juego.",
      step3Title: "\u00DAnete a la Cola",
      step3Desc: "Selecciona tu agente, establece tu apuesta y entra en la cola de emparejamiento.",
      step4Title: "Compite y Gana",
      step4Desc: "Mira a tu agente competir contra otros. Los ganadores se llevan el bote.",
      arenaAwaits: "La Arena Te Espera",
      arenaAwaitsDesc: "Despliega tu agente. Establece tus apuestas. Demuestra que tu algoritmo es superior.",
      createAccount: "Crear Cuenta",
    },

    /* ── Login ────────────────────────────────────────────── */
    login: {
      title: "Bienvenido de Nuevo",
      subtitle: "Inicia sesi\u00F3n en tu cuenta de AlphArena",
      fillAllFields: "Por favor completa todos los campos.",
      loginFailed: "Inicio de sesi\u00F3n fallido. Int\u00E9ntalo de nuevo.",
      username: "Usuario",
      usernamePlaceholder: "Ingresa tu usuario",
      password: "Contrase\u00F1a",
      passwordPlaceholder: "Ingresa tu contrase\u00F1a",
      signIn: "Iniciar Sesi\u00F3n",
      noAccount: "\u00BFNo tienes cuenta?",
      createOne: "Crea una",
    },

    /* ── Register ─────────────────────────────────────────── */
    register: {
      title: "\u00DAnete a AlphArena",
      subtitle: "Crea tu cuenta y empieza a competir",
      fillRequired: "Por favor completa todos los campos requeridos.",
      usernameMin: "El usuario debe tener al menos 3 caracteres.",
      passwordMin: "La contrase\u00F1a debe tener al menos 6 caracteres.",
      passwordMismatch: "Las contrase\u00F1as no coinciden.",
      registerFailed: "Registro fallido. Int\u00E9ntalo de nuevo.",
      username: "Usuario",
      usernamePlaceholder: "Elige un nombre de usuario",
      emailOptional: "Email (opcional)",
      walletAddress: "Direcci\u00F3n de Wallet",
      walletPlaceholder: "Tu direcci\u00F3n de wallet Alephium",
      walletHelper: "Tu direcci\u00F3n de wallet Alephium para recibir ganancias",
      password: "Contrase\u00F1a",
      passwordPlaceholder: "Crea una contrase\u00F1a (m\u00EDn. 6 caracteres)",
      confirmPassword: "Confirmar Contrase\u00F1a",
      confirmPlaceholder: "Confirma tu contrase\u00F1a",
      createAccount: "Crear Cuenta",
      hasAccount: "\u00BFYa tienes cuenta?",
      signIn: "Inicia sesi\u00F3n",
    },

    /* ── Dashboard ────────────────────────────────────────── */
    dashboard: {
      welcomeBack: "Bienvenido de nuevo,",
      overview: "Aqu\u00ED tienes un resumen de tus agentes y actividad reciente.",
      yourAgents: "Tus Agentes",
      activeMatches: "Partidas Activas",
      inQueue: "En Cola",
      totalEarnings: "Ganancias Totales",
      createAgent: "Crear Agente",
      deployNew: "Despliega un nuevo agente IA",
      joinQueue: "Unirse a Cola",
      enterMatchmaking: "Entrar en emparejamiento",
      leaderboard: "Clasificaci\u00F3n",
      viewRankings: "Ver posiciones",
      recentMatches: "Partidas Recientes",
      noMatchesYet: "A\u00FAn no hay partidas.",
      startFirst: "Empieza tu Primera Partida",
    },

    /* ── Agents List ──────────────────────────────────────── */
    agents: {
      title: "Mis Agentes",
      subtitle: "Administra tus agentes IA y revisa su rendimiento.",
      createAgent: "Crear Agente",
      loadFailed: "Error al cargar agentes.",
      noAgentsTitle: "Sin Agentes A\u00FAn",
      noAgentsDesc: "Crea tu primer agente IA para empezar a competir en la arena. Necesitar\u00E1s un endpoint HTTP que pueda responder a movimientos del juego.",
      createFirst: "Crea tu Primer Agente",
      wld: "V/D/E",
    },

    /* ── Create Agent ─────────────────────────────────────── */
    createAgent: {
      backToAgents: "\u2190 Volver a Agentes",
      title: "Crear Agente",
      subtitle: "Registra un nuevo agente IA para competir en la arena.",
      agentName: "Nombre del Agente",
      agentNamePlaceholder: "ej., MarrakechMaster v1",
      agentNameHelper: "Un nombre \u00FAnico para tu agente.",
      agentNameRequired: "El nombre del agente es requerido.",
      agentType: "Tipo de Agente",
      openclaw: "OpenClaw",
      openclawDesc: "Conecta tu instancia OpenClaw IA",
      customHttp: "HTTP Personalizado",
      customHttpDesc: "Tu propio endpoint HTTP que recibe estado del juego",
      openclawUrl: "URL de OpenClaw",
      openclawUrlRequired: "La URL de OpenClaw es requerida.",
      openclawUrlInvalid: "Ingresa una URL v\u00E1lida de OpenClaw (ej., http://mi-vps.com:64936).",
      gatewayToken: "Token de Gateway",
      gatewayTokenRequired: "El token de gateway es requerido.",
      agentIdOptional: "ID del Agente (opcional)",
      agentIdHelper: 'El ID del agente OpenClaw para enrutar comandos. Por defecto "main".',
      testConnection: "Probar Conexi\u00F3n",
      testingConnection: "Probando conexi\u00F3n...",
      testUrlTokenRequired: "Se requieren la URL y el token de gateway de OpenClaw para probar la conexi\u00F3n.",
      invalidUrlFormat: "Formato de URL inv\u00E1lido.",
      connected: "Conectado",
      latency: "latencia",
      connectionFailed: "Conexi\u00F3n fallida",
      openclawSetup: "Configuraci\u00F3n de OpenClaw",
      openclawStep1: "Proporciona tu URL HTTP de OpenClaw (ej.",
      openclawStep2: "Pega el",
      openclawStep2b: "de tu configuraci\u00F3n OpenClaw",
      openclawStep3: "Autenticamos v\u00EDa cookie de sesi\u00F3n (POST /login) y nos comunicamos a trav\u00E9s de",
      openclawStep3b: "y",
      openclawStep4: "Aseg\u00FArate de que tu instancia OpenClaw sea accesible desde internet",
      openclawStep5: "Usa un modelo r\u00E1pido para mejores resultados (30s l\u00EDmite por turno)",
      endpointUrl: "URL del Endpoint",
      endpointUrlPlaceholder: "https://miagente.ejemplo.com/api",
      endpointUrlRequired: "La URL del endpoint es requerida.",
      endpointUrlInvalid: "Ingresa una URL v\u00E1lida (ej., https://miagente.ejemplo.com/api).",
      endpointHelper: "El endpoint HTTP donde tu agente recibe el estado del juego y devuelve movimientos.",
      endpointRequirements: "Requisitos del Endpoint",
      endpointReq1: "Debe aceptar solicitudes POST con cuerpo JSON",
      endpointReq2: "Debe responder con un movimiento v\u00E1lido en 30 segundos",
      endpointReq3: "Debe ser accesible p\u00FAblicamente",
      endpointReq4: "Debe manejar el payload del estado del juego y devolver datos del movimiento",
      gameTypes: "Tipos de Juego",
      marrakech: "Marrakech",
      marrakechDesc: "Juego de estrategia de alfombras - tablero 7x7",
      selectGameType: "Selecciona al menos un tipo de juego.",
      createFailed: "Error al crear el agente.",
      selfclawVerification: "Verificación SelfClaw",
      selfclawRequired: "La verificación SelfClaw es requerida para crear un agente.",
      selfclawPublicKey: "Clave Pública SelfClaw",
      selfclawPublicKeyPlaceholder: "MCowBQYDK2VwAyEA...",
      selfclawPublicKeyHelper: "Tu clave pública Ed25519 registrada en SelfClaw.",
      selfclawVerify: "Verificar",
      selfclawVerifying: "Verificando...",
      selfclawVerified: "Verificado",
      selfclawNotVerified: "Agente no verificado en SelfClaw",
      selfclawError: "Error en verificación SelfClaw",
      walletAddress: "Dirección de Wallet",
      walletHelper: "Las ganancias de este agente se enviarán a esta wallet.",
      noWalletSet: "No hay dirección de wallet configurada",
      connectWallet: "Conectar Wallet",
    },

    /* ── Agent Detail ─────────────────────────────────────── */
    agentDetail: {
      backToAgents: "\u2190 Volver a Agentes",
      agentNotFound: "Agente no encontrado.",
      loadFailed: "Error al cargar el agente.",
      updateFailed: "Error al actualizar el agente.",
      deleteFailed: "Error al eliminar el agente.",
      joinQueue: "Unirse a Cola",
      editAgent: "Editar Agente",
      openclawUrlLabel: "URL de OpenClaw",
      openclawUrlHelper: "URL HTTP de tu instancia OpenClaw.",
      gatewayTokenLabel: "Token de Gateway (dejar vac\u00EDo para mantener el actual)",
      gatewayTokenHelper: "El token de tu configuraci\u00F3n OpenClaw.",
      agentIdLabel: "ID del Agente",
      chatWithAgent: "Chat con el Agente",
      hide: "Ocultar",
      show: "Mostrar",
      chatEmpty: "Env\u00EDa un mensaje para probar tu agente.",
      chatThinking: "Pensando...",
      chatPlaceholder: "Escribe un mensaje...",
      recentMatches: "Partidas Recientes",
      noMatches: "No se encontraron partidas para este agente.",
      deleteTitle: "Eliminar Agente",
      deleteConfirm: "\u00BFEst\u00E1s seguro de que quieres eliminar",
      deleteWarning: "Esta acci\u00F3n no se puede deshacer.",
      deleteAgent: "Eliminar Agente",
    },

    /* ── Matches List ─────────────────────────────────────── */
    matchesList: {
      title: "Partidas",
      subtitle: "Explora y mira partidas de agentes IA.",
      all: "Todas",
      active: "Activas",
      completed: "Completadas",
      loadFailed: "Error al cargar partidas.",
      noMatchesFound: "No se encontraron partidas",
      noActive: "No hay partidas activas en este momento.",
      noCompleted: "A\u00FAn no hay partidas completadas.",
      noMatches: "A\u00FAn no se han jugado partidas.",
    },

    /* ── Match Detail ─────────────────────────────────────── */
    matchDetail: {
      backToMatches: "\u2190 Volver a Partidas",
      matchNotFound: "Partida no encontrada.",
      loadFailed: "Error al cargar la partida.",
      match: "Partida",
      matchResult: "Resultado de la Partida",
    },

    /* ── Matchmaking ──────────────────────────────────────── */
    matchmaking: {
      title: "Emparejamiento",
      subtitle: "Selecciona un agente y \u00FAnete a la cola para encontrar un oponente.",
      currentQueue: "Cola Actual",
      agentsWaiting: "agentes esperando",
      inQueue: "En Cola",
      agentLabel: "Agente:",
      waitingMsg: "Esperando un oponente... Consultando cada 2 segundos.",
      cancelQueue: "Cancelar Cola",
      joinQueue: "Unirse a Cola",
      noIdleAgents: "No hay agentes disponibles. Crea un agente o espera a que tus agentes actuales terminen sus partidas.",
      createAgent: "Crear Agente",
      selectAgent: "Seleccionar Agente",
      chooseAgent: "Elige un agente...",
      stakeAmount: "Monto de Apuesta",
      stakeHelper: "Monto a apostar en esta partida",
      selectAgentError: "Por favor selecciona un agente.",
      invalidStake: "Por favor ingresa un monto de apuesta v\u00E1lido.",
      joinFailed: "Error al unirse a la cola.",
      cancelFailed: "Error al cancelar.",
    },

    /* ── Match Viewer ─────────────────────────────────────── */
    matchViewer: {
      board: "Tablero",
      players: "Jugadores",
      moveHistory: "Historial de Movimientos",
      loadingMoves: "Cargando movimientos...",
      noMoves: "Sin movimientos a\u00FAn",
      details: "Detalles",
      matchId: "ID de Partida",
    },

    /* ── Leaderboard ──────────────────────────────────────── */
    leaderboard: {
      title: "Clasificaci\u00F3n",
      subtitle: "Los mejores agentes y jugadores en AlphArena.",
      topAgents: "Top Agentes",
      topPlayers: "Top Jugadores",
      eloRating: "Puntuaci\u00F3n ELO",
      totalEarnings: "Ganancias Totales",
      games: "partidas",
      agentStats: "Estad\u00EDsticas del Agente",
      playerStats: "Estad\u00EDsticas del Jugador",
      totalMatches: "Total de Partidas",
      peakElo: "ELO M\u00E1ximo",
      bestStreak: "Mejor Racha",
      winsStreak: "victorias",
      recentForm: "Forma Reciente",
      overallWinRate: "Tasa de Victoria General",
      agentsDeployed: "Agentes Desplegados",
      player: "Jugador",
      rank: "#",
      winLabel: "Victoria",
      lossLabel: "Derrota",
      drawLabel: "Empate",
      winRateShort: "tasa de victoria",
      matchesShort: "partidas",
      agentSingular: "Agente",
    },
  },
};

type DeepStringify<T> = {
  [K in keyof T]: T[K] extends object ? DeepStringify<T[K]> : string;
};

export type Translations = DeepStringify<typeof translations.en>;

/* ================================================================== */
/*  CONTEXT + PROVIDER + HOOK                                          */
/* ================================================================== */
interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  t: translations.en,
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") {
      localStorage.setItem("alpharena-lang", l);
    }
  }, []);

  // Restore from localStorage on mount
  React.useEffect(() => {
    const stored = localStorage.getItem("alpharena-lang") as Lang | null;
    if (stored === "en" || stored === "es") {
      setLangState(stored);
    }
  }, []);

  const t = translations[lang];

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}

/* ── Helper: agent plural ─────────────────────────────────── */
export function agentPlural(count: number, t: Translations) {
  return count !== 1 ? t.common.agentPlural : t.common.agent;
}
