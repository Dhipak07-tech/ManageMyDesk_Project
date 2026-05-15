<?php

namespace App\Models;

use App\Enums\{ActivityType, VisibilityType};
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TicketActivity extends Model
{
    public $timestamps = false;
    protected $table = 'ticket_activities';

    protected $fillable = [
        'ticket_id', 'activity_type', 'visibility_type', 'channel',
        'message_id', 'thread_id', 'created_by', 'created_by_name',
        'created_at', 'message', 'metadata_json',
    ];

    protected $casts = [
        'activity_type' => ActivityType::class,
        'visibility_type' => VisibilityType::class,
        'metadata_json' => 'array',
        'created_at' => 'datetime',
    ];

    public function ticket(): BelongsTo { return $this->belongsTo(Ticket::class); }

    // Scopes for filtering (mirror existing ActivityTimeline filter tabs)
    public function scopePublicOnly($q) { return $q->where('visibility_type', 'public'); }
    public function scopeInternalOnly($q) { return $q->where('visibility_type', 'internal'); }
    public function scopeWorkNotes($q) { return $q->where('activity_type', 'work_note'); }
    public function scopeComments($q) { return $q->where('activity_type', 'comment'); }
    public function scopeEmails($q) { return $q->where('activity_type', 'like', 'email%'); }
    public function scopeWhatsApp($q) { return $q->where('activity_type', 'like', 'whatsapp%'); }
    public function scopeSystem($q) { return $q->whereIn('activity_type', ['status_change', 'system', 'sla_triggered', 'assignment_change']); }
}
