import { supabase } from '../supabaseClient';

const isPlaceholderSupabase = !import.meta.env.VITE_SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL.includes('placeholder');

function getCurrentUser() {
  const localUserStr = localStorage.getItem('summarix_user');
  if (localUserStr) {
    try {
      return JSON.parse(localUserStr);
    } catch (e) {
      // ignore
    }
  }
  return null;
}

async function getUser() {
  const localUser = getCurrentUser();
  if (localUser) return localUser;

  if (!isPlaceholderSupabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user || null;
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getLocalRecordings(userId) {
  try {
    const raw = localStorage.getItem(`summarix_recordings_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalRecordings(userId, list) {
  localStorage.setItem(`summarix_recordings_${userId}`, JSON.stringify(list));
}

function getLocalNotes(userId) {
  try {
    const raw = localStorage.getItem(`summarix_notes_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalNotes(userId, list) {
  localStorage.setItem(`summarix_notes_${userId}`, JSON.stringify(list));
}

function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const databaseService = {
  
  async getRecordings() {
    const user = await getUser();
    if (!user) return [];

    if (!isPlaceholderSupabase) {
      try {
        const { data, error } = await supabase
          .from('recordings')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) return data;
      } catch (err) {
        console.warn('Supabase getRecordings failed, using local storage:', err);
      }
    }

    return getLocalRecordings(user.id);
  },

  async uploadAudio(audioBlob) {
    const user = await getUser();
    if (!user) throw new Error('You must be logged in to upload audio');

    if (!isPlaceholderSupabase) {
      try {
        const fileName = `${user.id}_${Date.now()}.webm`;
        const filePath = `public/${fileName}`;

        const { data, error } = await supabase.storage
          .from('audio-recordings')
          .upload(filePath, audioBlob, { 
            contentType: 'audio/webm',
            cacheControl: '3600',
            upsert: false 
          });

        if (!error) {
          const { data: urlData } = supabase.storage
            .from('audio-recordings')
            .getPublicUrl(filePath);
          return { fileName, audioUrl: urlData.publicUrl };
        }
      } catch (err) {
        console.warn('Storage upload error, falling back to local Data URL:', err);
      }
    }

    const fileName = `local_${Date.now()}.webm`;
    let audioUrl = "";
    try {
      audioUrl = await blobToDataURL(audioBlob);
    } catch (e) {
      audioUrl = URL.createObjectURL(audioBlob);
    }
    return { fileName, audioUrl };
  },

  async saveRecording(recordingData) {
    const user = await getUser();
    if (!user) throw new Error('Not authenticated');

    const insertData = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      user_id: user.id,
      title: recordingData.title || 'Untitled Recording',
      audio_url: recordingData.audioUrl,
      file_name: recordingData.fileName,
      language: recordingData.language || 'Pending',
      speaker_count: recordingData.speakerCount || 0,
      transcription: recordingData.transcription || '',
      summary: recordingData.summary || '',
      action_items: recordingData.actionItems || [],
      key_topics: recordingData.keyTopics || [],
      notes: recordingData.notes || '',
      duration: recordingData.duration || 0,
      created_at: new Date().toISOString()
    };

    if (!isPlaceholderSupabase) {
      try {
        const { id, created_at, ...supabaseInsert } = insertData;
        const { data, error } = await supabase
          .from('recordings')
          .insert(supabaseInsert)
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Database insert error, saving locally:', err);
      }
    }

    const list = getLocalRecordings(user.id);
    list.unshift(insertData);
    saveLocalRecordings(user.id, list);
    return insertData;
  },

  async updateRecording(id, updates) {
    const user = await getUser();
    const updateData = { ...updates, updated_at: new Date().toISOString() };

    if (!isPlaceholderSupabase) {
      try {
        const { data, error } = await supabase
          .from('recordings')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Update error, updating locally:', err);
      }
    }

    if (user) {
      const list = getLocalRecordings(user.id);
      const index = list.findIndex(r => r.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], ...updateData };
        saveLocalRecordings(user.id, list);
        return list[index];
      }
    }
    return { id, ...updates };
  },

  async deleteRecording(id, fileName) {
    const user = await getUser();

    if (!isPlaceholderSupabase) {
      try {
        if (fileName) {
          await supabase.storage
            .from('audio-recordings')
            .remove([`public/${fileName}`]);
        }
        
        await supabase
          .from('recordings')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('Delete error in Supabase, removing locally:', err);
      }
    }

    if (user) {
      let list = getLocalRecordings(user.id);
      list = list.filter(r => r.id !== id);
      saveLocalRecordings(user.id, list);
    }
    return true;
  },

  async getNotes() {
    const user = await getUser();
    if (!user) return [];

    if (!isPlaceholderSupabase) {
      try {
        const { data, error } = await supabase
          .from('notes')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (!error && data) return data;
      } catch (err) {
        console.warn('Notes fetch error, using local storage:', err);
      }
    }

    return getLocalNotes(user.id);
  },

  async createNote(content) {
    const user = await getUser();
    if (!user) throw new Error('Not authenticated');

    const noteObj = {
      id: 'note_' + Date.now(),
      user_id: user.id,
      content,
      created_at: new Date().toISOString()
    };

    if (!isPlaceholderSupabase) {
      try {
        const { data, error } = await supabase
          .from('notes')
          .insert({ user_id: user.id, content })
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Create note error, saving locally:', err);
      }
    }

    const list = getLocalNotes(user.id);
    list.unshift(noteObj);
    saveLocalNotes(user.id, list);
    return noteObj;
  },

  async updateNote(id, content) {
    const user = await getUser();

    if (!isPlaceholderSupabase) {
      try {
        const { data, error } = await supabase
          .from('notes')
          .update({ content, updated_at: new Date().toISOString() })
          .eq('id', id)
          .select()
          .single();

        if (!error && data) return data;
      } catch (err) {
        console.warn('Update note error, updating locally:', err);
      }
    }

    if (user) {
      const list = getLocalNotes(user.id);
      const index = list.findIndex(n => n.id === id);
      if (index !== -1) {
        list[index] = { ...list[index], content, updated_at: new Date().toISOString() };
        saveLocalNotes(user.id, list);
        return list[index];
      }
    }
    return { id, content };
  },

  async deleteNote(id) {
    const user = await getUser();

    if (!isPlaceholderSupabase) {
      try {
        await supabase
          .from('notes')
          .delete()
          .eq('id', id);
      } catch (err) {
        console.warn('Delete note error, removing locally:', err);
      }
    }

    if (user) {
      let list = getLocalNotes(user.id);
      list = list.filter(n => n.id !== id);
      saveLocalNotes(user.id, list);
    }
    return true;
  }
};