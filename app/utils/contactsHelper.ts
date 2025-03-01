import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@services/supabase';
import { User } from '@navigation/types';

/**
 * Forces a refresh of the contacts import on next authentication
 * This can be used to manually trigger a contacts import if needed
 * @param profileId The ID of the user whose contacts should be refreshed
 */
export const forceContactsRefresh = async (profileId: string) => {
    try {
        if (!profileId) {
            console.error('No profile ID provided for contacts refresh');
            return false;
        }

        console.log(`Marking contacts for user with profile ID ${profileId} as needing refresh`);

        // Mark as not imported to force refresh on next login
        await AsyncStorage.setItem(`hasImportedContacts_${profileId}`, 'false');

        // Remove the last update timestamp
        await AsyncStorage.removeItem(`lastContactsUpdate_${profileId}`);

        console.log('Contacts marked for refresh on next login');
        return true;
    } catch (error) {
        console.error('Error forcing contacts refresh:', error);
        return false;
    }
};

/**
 * Clears all imported contacts for a user
 * This can be used to reset the contacts database for testing
 * @param profileId The ID of the user whose contacts should be cleared
 */
export const clearContactsData = async (profileId: string) => {
    try {
        if (!profileId) {
            console.error('No profile ID provided for contacts clear');
            return false;
        }

        console.log(`Clearing all contacts for user with profile ID ${profileId}`);

        // Delete all contacts for this user from the database using RLS
        const { error } = await supabase
            .from('contacts')
            .delete()
            .is('contact_user_id', null);  // Only delete unmatched contacts

        if (error) {
            console.error('Error clearing contacts:', error);
            throw error;
        }

        // Reset the AsyncStorage keys
        await AsyncStorage.setItem(`hasImportedContacts_${profileId}`, 'false');
        await AsyncStorage.removeItem(`lastContactsUpdate_${profileId}`);

        console.log('All contacts cleared successfully');
        return true;
    } catch (error) {
        console.error('Error clearing contacts data:', error);
        return false;
    }
};

/**
 * Gets statistics about a user's contacts
 * @param profileId The ID of the user whose contacts to check
 * @returns Object with statistics about the user's contacts
 */
export const getContactsStats = async (profileId: string) => {
    try {
        if (!profileId) {
            console.error('No profile ID provided for contacts stats');
            return null;
        }

        // Get total count of contacts - RLS will filter to user's contacts
        const { data: contactsCount, error: countError } = await supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true });

        if (countError) {
            console.error('Error getting contacts count:', countError);
            throw countError;
        }

        // Get count of matched contacts - RLS will filter to user's contacts
        const { data: matchedCount, error: matchedError } = await supabase
            .from('contacts')
            .select('id', { count: 'exact', head: true })
            .not('contact_user_id', 'is', null);

        if (matchedError) {
            console.error('Error getting matched contacts count:', matchedError);
            throw matchedError;
        }

        // Get the last update time
        const lastUpdateTime = await AsyncStorage.getItem(`lastContactsUpdate_${profileId}`);

        return {
            total: contactsCount?.count || 0,
            matched: matchedCount?.count || 0,
            lastUpdate: lastUpdateTime ? new Date(parseInt(lastUpdateTime)) : null,
            hasImported: await AsyncStorage.getItem(`hasImportedContacts_${profileId}`) === 'true'
        };
    } catch (error) {
        console.error('Error getting contacts stats:', error);
        return null;
    }
}; 