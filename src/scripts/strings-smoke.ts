import { t } from '../lib/i18n.js'

console.log('invalid:', t('errors.invalid.random'));
console.log('perm:', t('errors.permission.guild_member_only'));
console.log('lfg added:', t('lfg.added', { user: '@Donnie', tierLabel: 'Low Tier' }));
console.log('-- -- END SMOKE TEST -- --');
