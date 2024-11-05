import { supabase } from './supabaseClient'

export async function getUserByFirebaseUID(userId) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        *,
        subjects (
          id,
          title,
          description,
          created_at
        )
      `)
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching user:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in getUserByFirebaseUID:', error)
    throw error
  }
}

export async function createSubject(userId, { title, description }) {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .insert([
        { 
          user_id: userId,
          title,
          description
        }
      ])
      .select(`
        id,
        title,
        description,
        created_at,
        user_id
      `)
      .single()

    if (error) {
      console.error('Error creating subject:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in createSubject:', error)
    throw error
  }
}

export async function syncUserToSupabase(user) {
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert({
        id: user.uid,
        username: user.displayName || user.email.split('@')[0],
        email: user.email,
        photo_url: user.photoURL
      }, {
        onConflict: 'id',
        returning: true
      })
      .select()
      .single()

    if (error) {
      console.error('Error syncing user:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in syncUserToSupabase:', error)
    throw error
  }
}

export async function addText(userId, text) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert([
        { 
          user_id: userId,
          content: text
        }
      ])
      .select()
      .single()

    if (error) {
      console.error('Error adding text:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in addText:', error)
    throw error
  }
}

export async function getTexts(userId) {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching texts:', error)
      throw error
    }

    return data
  } catch (error) {
    console.error('Error in getTexts:', error)
    throw error
  }
} 