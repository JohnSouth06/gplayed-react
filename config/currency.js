import { getLocales } from 'expo-localization';

export const getRegionalPrice = (game) => {
  // On récupère le code pays du téléphone (ex: 'US', 'FR', 'JP', 'GB')
  const region = getLocales()[0]?.regionCode || 'FR'; 
  
  if (region === 'US') {
    return game.price_usa ? `${game.price_usa} $` : null;
  } 
  
  if (region === 'JP') {
    return game.price_jp ? `¥ ${game.price_jp}` : null;
  } 
  
  if (region === 'GB') {
    // Si tu ajoutes la conversion GBP plus tard
    return game.price_pal ? `£ ${game.price_pal}` : null; 
  }

  // Par défaut (Europe et reste du monde) : on affiche le prix PAL ou l'estimation globale
  const price = game.price_pal || game.estimated_price;
  return price ? `${price} €` : null;
};