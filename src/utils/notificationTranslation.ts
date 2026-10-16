/**
 * Utility to translate in-app and push notification messages into English
 * when Erasmus Mode is active.
 */

export function translateNotificationTitle(title: string, isEnglish: boolean): string {
  if (!isEnglish || !title) return title;

  return title
    .replace(/C'est votre tour d'acheter\s*!/gi, "It's your turn to buy!")
    .replace(/Nouveau produit ajouté\s*!/gi, 'New product added!')
    .replace(/Achat validé\s*!/gi, 'Purchase confirmed!')
    .replace(/Achat enregistré/gi, 'Purchase recorded')
    .replace(/C'est votre tour (de faire le|pour le) ménage\s*!/gi, "It's your turn to clean!")
    .replace(/Nouvelle tâche de ménage\s*!/gi, 'New cleaning chore!')
    .replace(/Rappel d'achat\s*!/gi, 'Shopping reminder!')
    .replace(/Rappel de ménage\s*!/gi, 'Cleaning reminder!')
    .replace(/Tâche en retard\s*!/gi, 'Overdue chore!')
    .replace(/Rachat nécessaire\s*!/gi, 'Restock needed!')
    .replace(/Rappel amical de colocation/gi, 'Friendly flatshare reminder')
    .replace(/Nouveau colocataire\s*!/gi, 'New roommate!')
    .replace(/Départ de la colocation/gi, 'Flatshare departure')
    .replace(/Rôle administrateur/gi, 'Administrator role')
    .replace(/Notifications ColocManager activées\s*!/gi, 'ColocManager notifications enabled!');
}

export function translateNotificationBody(body: string, isEnglish: boolean): string {
  if (!isEnglish || !body) return body;

  let translated = body;

  // Shopping turn
  translated = translated.replace(
    /"([^"]+)" a été acheté\. C'est maintenant à votre tour pour le prochain achat\s*!/gi,
    '"$1" was purchased. It is now your turn for the next purchase!'
  );
  translated = translated.replace(
    /Le produit "([^"]+)" a été ajouté\. Vous êtes le premier responsable de cet achat\s*!/gi,
    'Product "$1" was added. You are first responsible for this purchase!'
  );
  translated = translated.replace(
    /L'administrateur a ajouté "([^"]+)" à la liste des courses partagées\./gi,
    'The administrator added "$1" to the shared shopping list.'
  );
  translated = translated.replace(
    /L'administrateur a ajouté "([^"]+)" à la colocation\./gi,
    'The administrator added "$1" to the flatshare.'
  );
  translated = translated.replace(
    /Un colocataire a acheté "([^"]+)"\./gi,
    'A roommate purchased "$1".'
  );
  translated = translated.replace(
    /C'est votre tour d'acheter\s*:\s*"([^"]+)"\.\s*Pensez-y lors de vos courses\s*!/gi,
    'It\'s your turn to buy: "$1". Remember it during your grocery shopping!'
  );

  // Cleaning turn & reminders
  translated = translated.replace(
    /Le ménage "([^"]+)" \(([^)]+)\) a été validé\. C'est maintenant à votre tour d'ici le ([^!]+)\s*!/gi,
    'Cleaning "$1" ($2) was verified. It is now your turn by $3!'
  );
  translated = translated.replace(
    /Le ménage "([^"]+)" \(([^)]+)\) a été validé\. C'est maintenant à votre tour\s*!/gi,
    'Cleaning "$1" ($2) was verified. It is now your turn!'
  );
  translated = translated.replace(
    /La tâche "([^"]+)" \(([^)]+)\) a été planifiée\. Vous êtes le premier responsable\s*!/gi,
    'Chore "$1" ($2) was scheduled. You are first responsible!'
  );
  translated = translated.replace(
    /L'administrateur a programmé "([^"]+)" \(([^)]+)\)\./gi,
    'The administrator scheduled "$1" ($2).'
  );
  translated = translated.replace(
    /La tâche "([^"]+)" \(([^)]+)\) est en retard\s*!\s*Pensez à l'effectuer dès que possible\./gi,
    'Chore "$1" ($2) is overdue! Please complete it as soon as possible.'
  );
  translated = translated.replace(
    /N'oubliez pas\s*:\s*votre tâche "([^"]+)" \(([^)]+)\) est prévue pour le ([^.]+)\./gi,
    'Don\'t forget: your chore "$1" ($2) is scheduled for $3.'
  );

  // Restock (Inventory)
  translated = translated.replace(
    /(.+) signale qu'il faut racheter\s*:\s*(.+)\.\s*C'est votre tour\s*!/gi,
    '$1 reported that restock is needed for: $2. It\'s your turn!'
  );

  // Peer reminders
  translated = translated.replace(
    /(.+) vous rappelle gentiment qu'il faut acheter "([^"]+)"\./gi,
    '$1 gently reminds you to buy "$2".'
  );
  translated = translated.replace(
    /(.+) vous rappelle gentiment qu'il faut effectuer la tâche "([^"]+)"\./gi,
    '$1 gently reminds you to complete chore "$2".'
  );

  // Group events
  translated = translated.replace(
    /Un nouveau membre a rejoint la colocation "([^"]+)"\./gi,
    'A new roommate joined the flatshare "$1".'
  );
  translated = translated.replace(
    /Vous avez été retiré de la colocation\./gi,
    'You have been removed from the flatshare.'
  );
  translated = translated.replace(
    /Vous êtes désormais le nouvel administrateur de la colocation\./gi,
    'You are now the new administrator of the flatshare.'
  );

  // Welcome / test
  translated = translated.replace(
    /Tu recevras un rappel direct quand c'est ton tour d'acheter ou de nettoyer\s*!/gi,
    'You will receive a direct reminder when it is your turn to buy or clean!'
  );

  return translated;
}
