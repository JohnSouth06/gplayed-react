import { getLocales } from 'expo-localization';

export const getRegionalPrice = (game) => {
  // On récupère le code pays du téléphone (ex: 'US', 'FR', 'JP', 'GB')
  const region = getLocales()[0]?.regionCode || 'FR'; 
  
  // Priorité absolue au prix estimé saisi manuellement par l'utilisateur
  if (game.estimated_price) {
    if (region === 'US') return `${game.estimated_price} $`;
    if (region === 'JP') return `¥ ${game.estimated_price}`;
    if (region === 'GB') return `£ ${game.estimated_price}`;
    return `${game.estimated_price} €`;
  }

  // Fallback : On affiche les prix automatiques du script s'il n'y a pas d'estimation manuelle
  if (region === 'US') {
    return game.price_usa ? `${game.price_usa} $` : null;
  } 
  
  if (region === 'JP') {
    return game.price_jp ? `¥ ${game.price_jp}` : null;
  } 
  
  if (region === 'GB') {
    return game.price_pal ? `£ ${game.price_pal}` : null; 
  }

  // Par défaut (Europe et reste du monde)
  return game.price_pal ? `${game.price_pal} €` : null;
};